"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addTraceability = void 0;
const path = require("path");
const fs = require("fs");
const azure_actions_traceability_1 = require("@azure/azure-actions-traceability");
const httpClient_1 = require("../utilities/httpClient");
const InputParameters = require("../input-parameters");
function getAksResourceContext() {
    const runnerTempDirectory = process.env['RUNNER_TEMP'];
    const aksResourceContextPath = path.join(runnerTempDirectory, `aks-resource-context.json`);
    try {
        console.log(`Reading file: ${aksResourceContextPath}`);
        const rawContent = fs.readFileSync(aksResourceContextPath, 'utf-8');
        return JSON.parse(rawContent);
    }
    catch (ex) {
        return null;
        //throw new Error(`An error occured while reading/parsing the contents of the file: ${aksResourceContextPath}. Error: ${ex}`);
    }
}
function createDeploymentResource(aksResourceContext, deploymentPayload) {
    return __awaiter(this, void 0, void 0, function* () {
        const deploymentName = `${aksResourceContext.clusterName}-${InputParameters.namespace}-deployment-${process.env['GITHUB_SHA']}`;
        return new Promise((resolve, reject) => {
            var webRequest = new httpClient_1.WebRequest();
            webRequest.method = 'PUT';
            webRequest.uri = `${aksResourceContext.managementUrl}subscriptions/${aksResourceContext.subscriptionId}/resourceGroups/${aksResourceContext.resourceGroup}/providers/Microsoft.DeploymentCenterV2/deploymentsv2/${deploymentName}?api-version=2020-06-01-preview`;
            console.log(`Deployment resource URI: ${webRequest.uri}`);
            webRequest.headers = {
                'Authorization': 'Bearer ' + aksResourceContext.sessionToken,
                'Content-Type': 'application/json; charset=utf-8'
            };
            webRequest.body = JSON.stringify(deploymentPayload);
            httpClient_1.sendRequest(webRequest).then((response) => {
                if (response.statusCode == httpClient_1.StatusCodes.OK
                    || response.statusCode == httpClient_1.StatusCodes.CREATED
                    || response.statusCode == httpClient_1.StatusCodes.ACCEPTED) {
                    resolve(response.body);
                }
                else {
                    console.log(`An error occured while creating the deployment resource. Response body: '${JSON.stringify(response.body)}'`);
                    reject(JSON.stringify(response.body));
                }
            }).catch(reject);
        });
    });
}
function addTraceability(deployedManifestFiles) {
    return __awaiter(this, void 0, void 0, function* () {
        const aksResourceContext = getAksResourceContext();
        createDeploymentReport(aksResourceContext, deployedManifestFiles);
        // try {
        //   console.log(`Trying to create the deployment resource with payload: \n${JSON.stringify(deploymentPayload)}`);
        //   const deploymentResource = await createDeploymentResource(aksResourceContext, deploymentPayload);
        //   console.log(`Deployment resource created successfully. Deployment resource object: \n${JSON.stringify(deploymentResource)}`);
        // } catch (error) {
        //   console.log(`Some error occured: ${error}`);
        // }
        return Promise.resolve();
    });
}
exports.addTraceability = addTraceability;
function createDeploymentReport(context, deployedManifestFiles) {
    let kubernetesObjects = [];
    if (deployedManifestFiles && deployedManifestFiles.length > 0) {
        deployedManifestFiles.forEach((manifest) => {
            let manifestContent = JSON.parse(fs.readFileSync(manifest, { encoding: "utf-8" }));
            if (manifestContent &&
                manifestContent.kind &&
                manifestContent.metadata &&
                manifestContent.metadata.name) {
                kubernetesObjects.push({
                    kind: manifestContent.kind,
                    name: manifestContent.metadata.name
                });
            }
        });
    }
    const resource = {
        id: `/subscriptions/a/resourceGroups/v/providers/Microsoft.ContainerService/managedClusters/n`,
        provider: 'Azure',
        type: 'Microsoft.ContainerService/managedClusters',
        properties: {
            namespace: InputParameters.namespace,
            kubernetesObjects: kubernetesObjects
        }
    };
    const artifact = {
        type: 'container',
        properties: {}
    };
    const deploymentReport = new azure_actions_traceability_1.DeploymentReport([artifact], 'succeeded', resource);
    const deploymentReportPath = deploymentReport.export();
    console.log(fs.readFileSync(deploymentReportPath, { encoding: "utf-8" }));
    //core.setOutput('deployment-report', deploymentReportPath);
}