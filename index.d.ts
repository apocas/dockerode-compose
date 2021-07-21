declare module "lib/secrets" {
    function _exports(docker: any, projectName: any, recipe: any, output: any): Promise<any[]>;
    export = _exports;
}
declare module "lib/volumes" {
    function _exports(docker: any, projectName: any, recipe: any, output: any): Promise<any[]>;
    export = _exports;
}
declare module "lib/configs" {
    function _exports(docker: any, projectName: any, recipe: any, output: any): Promise<any[]>;
    export = _exports;
}
declare module "lib/networks" {
    function _exports(docker: any, projectName: any, recipe: any, output: any): Promise<{
        name: string;
        network: any;
    }[]>;
    export = _exports;
}
declare module "lib/tools" {
    export function getImages(recipe: any): any[];
    export function sortServices(recipe: any): any[];
    export function sortNetworksToAttach(networksToAttach: any): any[];
}
declare module "lib/servicesTools" {
    export function buildPorts(servicePorts: any, output: any): void;
    export function buildHostConfig(service: any, recipe: any): {
        RestartPolicy: {
            Name: any;
        };
    };
    export function buildVolumesHostconfig(volumes: any, output: any, type: any): void;
    export function buildVolumes(volumes: any, opts: any): void;
    export function buildEnvVars(service: any): any[];
    export function buildNetworks(serviceNetworks: any, networksToAttach: any): void;
    export function convertSizeStringToByteValue(obj: any): {}[];
    export function buildEnvVarsFromFile(env_file_path: any, output: any): void;
    export function fillPortArray(start: any, end: any): any;
    export function buildDockerImage(docker: any, buildPath: any, obj: any, dockerfile: any, options: any): Promise<void>;
}
declare module "lib/services" {
    function _exports(docker: any, projectName: any, recipe: any, output: any, options: any): Promise<any[]>;
    export = _exports;
}
declare module "compose" {
    export = Compose;
    class Compose {
        constructor(dockerode: any, file: any, projectName: any);
        docker: any;
        file: any;
        projectName: any;
        recipe: any;
        up(options: any): Promise<{
            file: any;
            secrets: any[];
            volumes: any[];
            configs: any[];
            networks: {
                name: string;
                network: any;
            }[];
            services: any[];
        }>;
        pull(serviceN: any, options: any): Promise<any[]>;
    }
}
