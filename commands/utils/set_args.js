const constants = require("./constants.js");
const fs = require("fs");
const path = require("path");
const process = require("process");

function write_file(file_path, content) {
  fs.writeFileSync(file_path, content, function (err) {
    if (err) throw err;
    console.log("File Saved at ", file_path);
  });
}

function sync_args_from_cmd(args) {
  return new Promise(function (resolve, reject) {
    let rawdata = fs.readFileSync(args["lambdatest-config-file"]);
    let lt_config = JSON.parse(rawdata);

    if (
      "lambdatest_auth" in lt_config &&
      "username" in lt_config["lambdatest_auth"] &&
      lt_config["lambdatest_auth"]["username"] == "<Your LambdaTest username>"
    ) {
      if (process.env.LT_USERNAME) {
        console.log(
          "Setting user name from environment",
          process.env.LT_USERNAME
        );
        lt_config["lambdatest_auth"]["username"] = process.env.LT_USERNAME;
      }
    } else if (
      process.env.LT_USERNAME &&
      (!("lambdatest_auth" in lt_config) ||
        !("username" in lt_config["lambdatest_auth"]))
    ) {
      console.log(
        "Setting user name from environment",
        process.env.LT_USERNAME
      );
      if (!lt_config["lambdatest_auth"]) {
        lt_config["lambdatest_auth"] = {};
      }
      lt_config["lambdatest_auth"]["username"] = process.env.LT_USERNAME;
    }

    if (
      "lambdatest_auth" in lt_config &&
      "access_key" in lt_config["lambdatest_auth"] &&
      lt_config["lambdatest_auth"]["access_key"] ==
        "<Your LambdaTest access key>"
    ) {
      if (process.env.LT_ACCESS_KEY) {
        console.log("setting access key from environment");
        lt_config["lambdatest_auth"]["access_key"] = process.env.LT_ACCESS_KEY;
      }
    } else if (
      process.env.LT_ACCESS_KEY &&
      (!("lambdatest_auth" in lt_config) ||
        !("access_key" in lt_config["lambdatest_auth"]))
    ) {
      if (!lt_config["lambdatest_auth"]) {
        lt_config["lambdatest_auth"] = {};
      }
      console.log("Setting access key from environment");
      lt_config["lambdatest_auth"]["access_key"] = process.env.LT_ACCESS_KEY;
    }

    if (!("browsers" in lt_config) || lt_config["browsers"].length == 0) {
      lt_config["browsers"] = [];
      console.log("Testing on default browser");
      lt_config["browsers"].push({
        browser: "Chrome",
        platform: "Windows 10",
        versions: ["86.0"],
      });
    }

    if (!("specs" in args) && "specs" in lt_config["run_settings"]) {
      lt_config["run_settings"]["specs"] =
        lt_config["run_settings"]["specs"].split(",");
    } else if ("specs" in args) {
      args["specs"] = args["specs"].split(",");
      lt_config["run_settings"]["specs"] = args["specs"];
    }
    if ("cypress-config-file" in args) {
      lt_config["run_settings"]["cypress_config_file"] =
        args["cypress-config-file"];
    } else if (
      !lt_config["run_settings"]["cypress_config_file"] &&
      fs.existsSync(path.join(process.cwd(), "cypress.json"))
    ) {
      lt_config["run_settings"]["cypress_config_file"] = path.join(
        process.cwd(),
        "cypress.json"
      );
    }
    //Set the env variables
    let env_vars = undefined;
    if ("envs" in args) {
      env_vars = args["envs"].split(",");
    } else if (lt_config["run_settings"]["envs"]) {
      env_vars = lt_config["run_settings"]["envs"].split(",");
    }

    if (env_vars) {
      let envs = {};
      for (env in env_vars) {
        envs[env_vars[env].split("=")[0]] = env_vars[env].split("=")[1];
      }
      lt_config["run_settings"]["envs"] = envs;
    }
    if (
      "cypress-env-file" in args ||
      lt_config["run_settings"]["cypress-env-file"]
    ) {
      let env_json;
      let file_path;
      if ("cypress-env-file" in args) {
        file_path = args["cypress-env-file"];
      } else {
        file_path = lt_config["run_settings"]["cypress-env-file"];
      }
      if (fs.existsSync(file_path)) {
        let raw_env = fs.readFileSync(file_path);
        env_json = JSON.parse(raw_env);

        if (lt_config["run_settings"]["envs"]) {
          lt_config["run_settings"]["envs"] = Object.assign(
            lt_config["run_settings"]["envs"],
            env_json
          );
        } else {
          lt_config["run_settings"]["envs"] = env_json;
        }
      } else {
        reject("Cypress-env-file file not found but passed in command line");
      }
    }
    //set the build name on the basis of build identifier
    if ("build-name" in args) {
      lt_config["run_settings"]["build_name"] = args["build-name"];
    }
    if ("build-identifier" in args && lt_config["run_settings"]["build_name"]) {
      lt_config["run_settings"]["build_name"] =
        lt_config["run_settings"]["build_name"] + args["build-identifier"];
    } else if (
      "build-identifier" in args &&
      !lt_config["run_settings"]["build_name"]
    ) {
      lt_config["run_settings"]["build_name"] = args["build-identifier"];
    } else if (
      lt_config["run_settings"]["build_name"] &&
      lt_config["run_settings"]["build_identifier"]
    ) {
      lt_config["run_settings"]["build_name"] =
        lt_config["run_settings"]["build_name"] +
        lt_config["run_settings"]["build_identifier"];
    }

    if ("tags" in args) {
      lt_config["run_settings"]["tags"] = args["tags"].split(",");
    }

    if ("parallels" in args) {
      lt_config["run_settings"]["parallels"] = parseInt(args["parallels"]);
    } else if (!lt_config["run_settings"]["parallels"]) {
      lt_config["run_settings"]["parallels"] = 0;
    } else {
      lt_config["run_settings"]["parallels"] = parseInt(
        lt_config["run_settings"]["parallels"]
      );
    }

    //set tunnel options
    if ("tunnel" in args) {
      if (!("tunnel_settings" in lt_config)) {
        lt_config["tunnel_settings"] = {};
      }
      lt_config["tunnel_settings"]["tunnel"] = true
        ? args["tunnel"] == "true"
        : false;
    } else if (!("tunnel_settings" in lt_config)) {
      lt_config["tunnel_settings"] = {};
      lt_config["tunnel_settings"]["tunnel"] = false;
    } else if (!("tunnel" in lt_config["tunnel_settings"])) {
      lt_config["tunnel_settings"]["tunnel"] = false;
    }

    if ("tunnel_name" in args) {
      if (!("tunnel_settings" in lt_config)) {
        lt_config["tunnel_settings"] = {};
      }
      lt_config["tunnel_settings"]["tunnel_name"] = args["tunnel_name"];
    } else if (!("tunnel_settings" in lt_config)) {
      lt_config["tunnel_settings"] = {};
      lt_config["tunnel_settings"]["tunnel_name"] = "";
    } else if (!("tunnel_name" in lt_config["tunnel_settings"])) {
      lt_config["tunnel_settings"]["tunnel_name"] = "";
    }

    //add browsers from cli
    if ("browsers" in args) {
      browsers = args["browsers"].split(",");
      browsers_formatted = [];
      for (browser in browsers) {
        browsers_formatted.push({
          platform: browsers[browser].split(":")[0],
          browser: browsers[browser].split(":")[1],
          versions: [browsers[browser].split(":")[2]],
        });
      }
      lt_config["browsers"] = browsers_formatted;
    }
    if (!lt_config["run_settings"]["ignore_files"]) {
      lt_config["run_settings"]["ignore_files"] = [];
    } else {
      lt_config["run_settings"]["ignore_files"] =
        lt_config["run_settings"]["ignore_files"].split(",");
    }
    if ("ignore_files" in args) {
      lt_config["run_settings"]["ignore_files"] =
        args["ignore_files"].split(",");
    }
    if ("cypress_version" in args) {
      lt_config["run_settings"]["cypress_version"] = args["cypress_version"];
    } else if (lt_config["run_settings"]["cypress_version"]) {
      lt_config["run_settings"]["cypress_version"] = String(
        lt_config["run_settings"]["cypress_version"]
      );
    }
    if ("sync" in args) {
      lt_config["run_settings"]["sync"] = true ? args["sync"] == "true" : false;
      if ("exit-on-failure" in args) {
        lt_config["run_settings"]["exit-on-failure"] = true;
      } else {
        lt_config["run_settings"]["exit-on-failure"] = false;
      }
    }

    if ("autostart" in args) {
      lt_config["tunnel_settings"]["autostart"] = true
        ? args["autostart"] == "true"
        : false;
    } else {
      lt_config["tunnel_settings"]["autostart"] = true;
    }

    if ("network" in args) {
      lt_config["run_settings"]["network"] = true
        ? args["network"] == "true"
        : false;
    } else if (!lt_config["run_settings"]["network"]) {
      lt_config["run_settings"]["network"] = false;
    }

    if ("headless" in args) {
      lt_config["run_settings"]["headless"] = args["headless"];
    } else if (!lt_config["run_settings"]["headless"]) {
      lt_config["run_settings"]["headless"] = false;
    }

    //check for download folders
    if (!("downloads" in lt_config["run_settings"])) {
      lt_config["run_settings"]["downloads"] = "";
    }
    //get specs from current directory if specs are not passed in config or cli
    if (
      (lt_config["run_settings"]["specs"] == undefined ||
        lt_config["run_settings"]["specs"].length == 0) &&
      fs.existsSync(constants.DEFAULT_TEST_PATH)
    ) {
      args["specs"] = [];
      console.log("Checking for specs in Current directory");
      read_files(constants.DEFAULT_TEST_PATH).then(function (files) {
        lt_config["run_settings"]["specs"] = files;
        resolve(lt_config);
      });
    } else {
      resolve(lt_config);
    }
  });
}

function read_files(dir_path) {
  return new Promise(function (resolve, reject) {
    files = [];
    const regex = new RegExp("^.*?.spec.js$");
    fs.readdirSync(dir_path).forEach((file) => {
      if (regex.test(file)) {
        files.push(path.join(dir_path, file));
      }
    });
    resolve(files);
  });
}

module.exports = {
  sync_args_from_cmd: sync_args_from_cmd,
};
