const { TestEnvironment } = require("jest-environment-node");
const fs = require("node:fs");
const path = require("node:path");

module.exports = class NativeEnvironment extends TestEnvironment {
  async setup() {
    await super.setup();
    this.global.mockNativeFetch = globalThis.fetch.bind(globalThis);
    this.global.__nativeFormData = globalThis.FormData;
    this.global.__nativeBlob = globalThis.Blob;
    const reportPath = path.resolve(__dirname, "../../../backend/harmonia-app/target/mobile-framework-newman.json");
    const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    const fixtures = {};
    for (const execution of report.run.executions) {
      const name = execution.item.name;
      const body = execution.response.stream;
      if (/^(17|18) - Login/.test(name)) {
        const role = name.startsWith("17") ? "teacher" : "student";
        const request = JSON.parse(execution.request.body.raw);
        fixtures[role] = { ...request, ...JSON.parse(Buffer.from(body.data ?? body).toString("utf8")) };
      }
    }
    this.global.__liveFixtures = fixtures;
  }
};
