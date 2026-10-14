export namespace compose {
	
	export class ContainerStatus {
	    id: string;
	    name: string;
	    service: string;
	    state: string;
	    status: string;
	    ports: string;
	
	    static createFrom(source: any = {}) {
	        return new ContainerStatus(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.service = source["service"];
	        this.state = source["state"];
	        this.status = source["status"];
	        this.ports = source["ports"];
	    }
	}
	export class DownOptions {
	    removeVolumes: boolean;
	    removeImages: boolean;
	    removeOrphans: boolean;
	
	    static createFrom(source: any = {}) {
	        return new DownOptions(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.removeVolumes = source["removeVolumes"];
	        this.removeImages = source["removeImages"];
	        this.removeOrphans = source["removeOrphans"];
	    }
	}
	export class Snapshot {
	    hash: string;
	    message: string;
	    timestamp: string;
	    content: string;
	
	    static createFrom(source: any = {}) {
	        return new Snapshot(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.hash = source["hash"];
	        this.message = source["message"];
	        this.timestamp = source["timestamp"];
	        this.content = source["content"];
	    }
	}
	export class ServiceInfo {
	    name: string;
	    image: string;
	    containerName?: string;
	    ports: string[];
	    status: string;
	
	    static createFrom(source: any = {}) {
	        return new ServiceInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.image = source["image"];
	        this.containerName = source["containerName"];
	        this.ports = source["ports"];
	        this.status = source["status"];
	    }
	}
	export class Project {
	    id: string;
	    name: string;
	    workingDir: string;
	    filePath: string;
	    content: string;
	    contentHash: string;
	    temporaryContent?: string;
	    temporaryHash?: string;
	    hasStagedChanges: boolean;
	    services: ServiceInfo[];
	    networks: string[];
	    volumes: string[];
	    status: string;
	    snapshots?: Snapshot[];
	    envContent?: string;
	    hasEnvFile: boolean;
	
	    static createFrom(source: any = {}) {
	        return new Project(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.workingDir = source["workingDir"];
	        this.filePath = source["filePath"];
	        this.content = source["content"];
	        this.contentHash = source["contentHash"];
	        this.temporaryContent = source["temporaryContent"];
	        this.temporaryHash = source["temporaryHash"];
	        this.hasStagedChanges = source["hasStagedChanges"];
	        this.services = this.convertValues(source["services"], ServiceInfo);
	        this.networks = source["networks"];
	        this.volumes = source["volumes"];
	        this.status = source["status"];
	        this.snapshots = this.convertValues(source["snapshots"], Snapshot);
	        this.envContent = source["envContent"];
	        this.hasEnvFile = source["hasEnvFile"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	
	export class UpOptions {
	    services?: string[];
	    detach: boolean;
	    build: boolean;
	    removeOrphans: boolean;
	    useStaged: boolean;
	
	    static createFrom(source: any = {}) {
	        return new UpOptions(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.services = source["services"];
	        this.detach = source["detach"];
	        this.build = source["build"];
	        this.removeOrphans = source["removeOrphans"];
	        this.useStaged = source["useStaged"];
	    }
	}

}

export namespace config {
	
	export class RegistryAuth {
	    serverAddress: string;
	    username?: string;
	    password?: string;
	    identityToken?: string;
	
	    static createFrom(source: any = {}) {
	        return new RegistryAuth(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.serverAddress = source["serverAddress"];
	        this.username = source["username"];
	        this.password = source["password"];
	        this.identityToken = source["identityToken"];
	    }
	}
	export class UIConfig {
	    theme: string;
	    refreshInterval: number;
	    notifications: boolean;
	    compactView: boolean;
	    autoCheckUpdates: boolean;
	
	    static createFrom(source: any = {}) {
	        return new UIConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.theme = source["theme"];
	        this.refreshInterval = source["refreshInterval"];
	        this.notifications = source["notifications"];
	        this.compactView = source["compactView"];
	        this.autoCheckUpdates = source["autoCheckUpdates"];
	    }
	}
	export class RuntimeConfig {
	    selected: string;
	    dockerSocket?: string;
	    podmanSocket?: string;
	    autoConnect: boolean;
	
	    static createFrom(source: any = {}) {
	        return new RuntimeConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.selected = source["selected"];
	        this.dockerSocket = source["dockerSocket"];
	        this.podmanSocket = source["podmanSocket"];
	        this.autoConnect = source["autoConnect"];
	    }
	}
	export class Config {
	    version: number;
	    runtime: RuntimeConfig;
	    ui: UIConfig;
	    registries: Record<string, RegistryAuth>;
	    favorites: string[];
	    customData?: Record<string, string>;
	
	    static createFrom(source: any = {}) {
	        return new Config(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.version = source["version"];
	        this.runtime = this.convertValues(source["runtime"], RuntimeConfig);
	        this.ui = this.convertValues(source["ui"], UIConfig);
	        this.registries = this.convertValues(source["registries"], RegistryAuth, true);
	        this.favorites = source["favorites"];
	        this.customData = source["customData"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	

}

export namespace containers {
	
	export class Container {
	    id: string;
	    shortId: string;
	    name: string;
	    image: string;
	    status: string;
	    state: string;
	    ports: string[];
	    created?: number;
	
	    static createFrom(source: any = {}) {
	        return new Container(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.shortId = source["shortId"];
	        this.name = source["name"];
	        this.image = source["image"];
	        this.status = source["status"];
	        this.state = source["state"];
	        this.ports = source["ports"];
	        this.created = source["created"];
	    }
	}
	export class ResourceStats {
	    cpuPercent: number;
	    memoryUsage: number;
	    memoryLimit: number;
	    memoryPercent: number;
	    netRxBytes: number;
	    netTxBytes: number;
	    blockRead: number;
	    blockWrite: number;
	    pids: number;
	
	    static createFrom(source: any = {}) {
	        return new ResourceStats(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.cpuPercent = source["cpuPercent"];
	        this.memoryUsage = source["memoryUsage"];
	        this.memoryLimit = source["memoryLimit"];
	        this.memoryPercent = source["memoryPercent"];
	        this.netRxBytes = source["netRxBytes"];
	        this.netTxBytes = source["netTxBytes"];
	        this.blockRead = source["blockRead"];
	        this.blockWrite = source["blockWrite"];
	        this.pids = source["pids"];
	    }
	}

}

export namespace images {
	
	export class Image {
	    id: string;
	    shortId: string;
	    repository: string;
	    tag: string;
	    repoTags: string[];
	    repoDigests: string[];
	    created: number;
	    size: number;
	    formattedSize: string;
	    containers: number;
	    labels: Record<string, string>;
	
	    static createFrom(source: any = {}) {
	        return new Image(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.shortId = source["shortId"];
	        this.repository = source["repository"];
	        this.tag = source["tag"];
	        this.repoTags = source["repoTags"];
	        this.repoDigests = source["repoDigests"];
	        this.created = source["created"];
	        this.size = source["size"];
	        this.formattedSize = source["formattedSize"];
	        this.containers = source["containers"];
	        this.labels = source["labels"];
	    }
	}

}

export namespace networks {
	
	export class Network {
	    id: string;
	    shortId: string;
	    name: string;
	    driver: string;
	    scope: string;
	    internal: boolean;
	    attachable: boolean;
	    subnet?: string;
	    gateway?: string;
	    containers?: Record<string, string>;
	    labels: Record<string, string>;
	
	    static createFrom(source: any = {}) {
	        return new Network(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.shortId = source["shortId"];
	        this.name = source["name"];
	        this.driver = source["driver"];
	        this.scope = source["scope"];
	        this.internal = source["internal"];
	        this.attachable = source["attachable"];
	        this.subnet = source["subnet"];
	        this.gateway = source["gateway"];
	        this.containers = source["containers"];
	        this.labels = source["labels"];
	    }
	}

}

export namespace registry {
	
	export class ImageMetadata {
	    name: string;
	    description: string;
	    fullDescription?: string;
	    starCount: number;
	    pullCount: number;
	    lastUpdated: string;
	    registry: string;
	
	    static createFrom(source: any = {}) {
	        return new ImageMetadata(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.description = source["description"];
	        this.fullDescription = source["fullDescription"];
	        this.starCount = source["starCount"];
	        this.pullCount = source["pullCount"];
	        this.lastUpdated = source["lastUpdated"];
	        this.registry = source["registry"];
	    }
	}
	export class SearchResult {
	    name: string;
	    description: string;
	    stars: number;
	    pullCount: number;
	    isOfficial: boolean;
	    isAutomated: boolean;
	    registry: string;
	
	    static createFrom(source: any = {}) {
	        return new SearchResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.description = source["description"];
	        this.stars = source["stars"];
	        this.pullCount = source["pullCount"];
	        this.isOfficial = source["isOfficial"];
	        this.isAutomated = source["isAutomated"];
	        this.registry = source["registry"];
	    }
	}
	export class Tag {
	    name: string;
	    size: number;
	    formattedSize: string;
	    lastUpdated: string;
	    digest: string;
	    architectures?: string[];
	
	    static createFrom(source: any = {}) {
	        return new Tag(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.size = source["size"];
	        this.formattedSize = source["formattedSize"];
	        this.lastUpdated = source["lastUpdated"];
	        this.digest = source["digest"];
	        this.architectures = source["architectures"];
	    }
	}

}

export namespace runtime {
	
	export class ContainerCreateOptions {
	    name?: string;
	    image: string;
	    command?: string[];
	    env?: string[];
	    ports?: Record<string, Array<ContainerPortBinding>>;
	    portMappings?: string[];
	    volumes?: string[];
	    networks?: string[];
	    restartPolicy?: string;
	    labels?: Record<string, string>;
	
	    static createFrom(source: any = {}) {
	        return new ContainerCreateOptions(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.image = source["image"];
	        this.command = source["command"];
	        this.env = source["env"];
	        this.ports = this.convertValues(source["ports"], Array<ContainerPortBinding>, true);
	        this.portMappings = source["portMappings"];
	        this.volumes = source["volumes"];
	        this.networks = source["networks"];
	        this.restartPolicy = source["restartPolicy"];
	        this.labels = source["labels"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class NetworkSettings {
	    ipAddress: string;
	    gateway: string;
	    macAddress: string;
	    networks: Record<string, string>;
	
	    static createFrom(source: any = {}) {
	        return new NetworkSettings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.ipAddress = source["ipAddress"];
	        this.gateway = source["gateway"];
	        this.macAddress = source["macAddress"];
	        this.networks = source["networks"];
	    }
	}
	export class MountPoint {
	    type: string;
	    name?: string;
	    source: string;
	    destination: string;
	    driver?: string;
	    mode: string;
	    rw: boolean;
	
	    static createFrom(source: any = {}) {
	        return new MountPoint(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.type = source["type"];
	        this.name = source["name"];
	        this.source = source["source"];
	        this.destination = source["destination"];
	        this.driver = source["driver"];
	        this.mode = source["mode"];
	        this.rw = source["rw"];
	    }
	}
	export class Port {
	    ip?: string;
	    privatePort: number;
	    publicPort?: number;
	    type: string;
	
	    static createFrom(source: any = {}) {
	        return new Port(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.ip = source["ip"];
	        this.privatePort = source["privatePort"];
	        this.publicPort = source["publicPort"];
	        this.type = source["type"];
	    }
	}
	export class ContainerState {
	    status: string;
	    running: boolean;
	    paused: boolean;
	    restarting: boolean;
	    oomKilled: boolean;
	    dead: boolean;
	    pid: number;
	    exitCode: number;
	    error: string;
	    startedAt: string;
	    finishedAt: string;
	
	    static createFrom(source: any = {}) {
	        return new ContainerState(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.status = source["status"];
	        this.running = source["running"];
	        this.paused = source["paused"];
	        this.restarting = source["restarting"];
	        this.oomKilled = source["oomKilled"];
	        this.dead = source["dead"];
	        this.pid = source["pid"];
	        this.exitCode = source["exitCode"];
	        this.error = source["error"];
	        this.startedAt = source["startedAt"];
	        this.finishedAt = source["finishedAt"];
	    }
	}
	export class ContainerInspect {
	    id: string;
	    name: string;
	    image: string;
	    imageId: string;
	    created: string;
	    state: ContainerState;
	    command: string;
	    args: string[];
	    env: string[];
	    labels: Record<string, string>;
	    ports: Port[];
	    mounts: MountPoint[];
	    network: NetworkSettings;
	    restartCount: number;
	    platform: string;
	
	    static createFrom(source: any = {}) {
	        return new ContainerInspect(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.image = source["image"];
	        this.imageId = source["imageId"];
	        this.created = source["created"];
	        this.state = this.convertValues(source["state"], ContainerState);
	        this.command = source["command"];
	        this.args = source["args"];
	        this.env = source["env"];
	        this.labels = source["labels"];
	        this.ports = this.convertValues(source["ports"], Port);
	        this.mounts = this.convertValues(source["mounts"], MountPoint);
	        this.network = this.convertValues(source["network"], NetworkSettings);
	        this.restartCount = source["restartCount"];
	        this.platform = source["platform"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ContainerPortBinding {
	    hostIp?: string;
	    hostPort: string;
	
	    static createFrom(source: any = {}) {
	        return new ContainerPortBinding(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.hostIp = source["hostIp"];
	        this.hostPort = source["hostPort"];
	    }
	}
	
	export class ImageDeleteResult {
	    untagged?: string;
	    deleted?: string;
	
	    static createFrom(source: any = {}) {
	        return new ImageDeleteResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.untagged = source["untagged"];
	        this.deleted = source["deleted"];
	    }
	}
	export class ImageInspect {
	    id: string;
	    repoTags: string[];
	    repoDigests: string[];
	    parent: string;
	    comment: string;
	    created: string;
	    author: string;
	    architecture: string;
	    os: string;
	    size: number;
	    virtualSize: number;
	    labels: Record<string, string>;
	    env: string[];
	    cmd: string[];
	    workingDir: string;
	    entrypoint: string[];
	
	    static createFrom(source: any = {}) {
	        return new ImageInspect(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.repoTags = source["repoTags"];
	        this.repoDigests = source["repoDigests"];
	        this.parent = source["parent"];
	        this.comment = source["comment"];
	        this.created = source["created"];
	        this.author = source["author"];
	        this.architecture = source["architecture"];
	        this.os = source["os"];
	        this.size = source["size"];
	        this.virtualSize = source["virtualSize"];
	        this.labels = source["labels"];
	        this.env = source["env"];
	        this.cmd = source["cmd"];
	        this.workingDir = source["workingDir"];
	        this.entrypoint = source["entrypoint"];
	    }
	}
	
	export class NetworkCreateOptions {
	    name: string;
	    driver?: string;
	    internal: boolean;
	    attachable: boolean;
	    labels?: Record<string, string>;
	
	    static createFrom(source: any = {}) {
	        return new NetworkCreateOptions(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.driver = source["driver"];
	        this.internal = source["internal"];
	        this.attachable = source["attachable"];
	        this.labels = source["labels"];
	    }
	}
	
	
	export class SystemInfo {
	    id: string;
	    containers: number;
	    containersRunning: number;
	    containersPaused: number;
	    containersStopped: number;
	    images: number;
	    driver: string;
	    memoryTotal: number;
	    cpus: number;
	    operatingSystem: string;
	    osType: string;
	    architecture: string;
	    serverVersion: string;
	
	    static createFrom(source: any = {}) {
	        return new SystemInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.containers = source["containers"];
	        this.containersRunning = source["containersRunning"];
	        this.containersPaused = source["containersPaused"];
	        this.containersStopped = source["containersStopped"];
	        this.images = source["images"];
	        this.driver = source["driver"];
	        this.memoryTotal = source["memoryTotal"];
	        this.cpus = source["cpus"];
	        this.operatingSystem = source["operatingSystem"];
	        this.osType = source["osType"];
	        this.architecture = source["architecture"];
	        this.serverVersion = source["serverVersion"];
	    }
	}
	export class SystemVersion {
	    version: string;
	    apiVersion: string;
	    minApiVersion: string;
	    gitCommit?: string;
	    goVersion?: string;
	    os: string;
	    arch: string;
	
	    static createFrom(source: any = {}) {
	        return new SystemVersion(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.version = source["version"];
	        this.apiVersion = source["apiVersion"];
	        this.minApiVersion = source["minApiVersion"];
	        this.gitCommit = source["gitCommit"];
	        this.goVersion = source["goVersion"];
	        this.os = source["os"];
	        this.arch = source["arch"];
	    }
	}
	export class VolumeCreateOptions {
	    name: string;
	    driver?: string;
	    driverOpts?: Record<string, string>;
	    labels?: Record<string, string>;
	
	    static createFrom(source: any = {}) {
	        return new VolumeCreateOptions(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.driver = source["driver"];
	        this.driverOpts = source["driverOpts"];
	        this.labels = source["labels"];
	    }
	}

}

export namespace types {
	
	export class RuntimeStatus {
	    name: string;
	    installed: boolean;
	    running: boolean;
	    version: string;
	    needsAuth: boolean;
	    message: string;
	
	    static createFrom(source: any = {}) {
	        return new RuntimeStatus(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.installed = source["installed"];
	        this.running = source["running"];
	        this.version = source["version"];
	        this.needsAuth = source["needsAuth"];
	        this.message = source["message"];
	    }
	}
	export class DetectionResult {
	    os: string;
	    docker: RuntimeStatus;
	    podman: RuntimeStatus;
	    recommended: string;
	    prerequisitesMet: boolean;
	    details: string[];
	
	    static createFrom(source: any = {}) {
	        return new DetectionResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.os = source["os"];
	        this.docker = this.convertValues(source["docker"], RuntimeStatus);
	        this.podman = this.convertValues(source["podman"], RuntimeStatus);
	        this.recommended = source["recommended"];
	        this.prerequisitesMet = source["prerequisitesMet"];
	        this.details = source["details"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class InstallStep {
	    id: string;
	    title: string;
	    description: string;
	    command: string;
	    privileged: boolean;
	    optional: boolean;
	
	    static createFrom(source: any = {}) {
	        return new InstallStep(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.title = source["title"];
	        this.description = source["description"];
	        this.command = source["command"];
	        this.privileged = source["privileged"];
	        this.optional = source["optional"];
	    }
	}
	export class InstallPlan {
	    runtime: string;
	    os: string;
	    packageManager: string;
	    steps: InstallStep[];
	    warning?: string;
	
	    static createFrom(source: any = {}) {
	        return new InstallPlan(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.runtime = source["runtime"];
	        this.os = source["os"];
	        this.packageManager = source["packageManager"];
	        this.steps = this.convertValues(source["steps"], InstallStep);
	        this.warning = source["warning"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	

}

export namespace updater {
	
	export class DownloadProgress {
	    percentage: number;
	    totalBytes: number;
	    readBytes: number;
	    status: string;
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new DownloadProgress(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.percentage = source["percentage"];
	        this.totalBytes = source["totalBytes"];
	        this.readBytes = source["readBytes"];
	        this.status = source["status"];
	        this.error = source["error"];
	    }
	}
	export class UpdateInfo {
	    available: boolean;
	    currentVersion: string;
	    latestVersion: string;
	    releaseName: string;
	    releaseNotes: string;
	    publishedAt: string;
	    releaseUrl: string;
	    downloadUrl: string;
	    assetFileName: string;
	    platform: string;
	
	    static createFrom(source: any = {}) {
	        return new UpdateInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.available = source["available"];
	        this.currentVersion = source["currentVersion"];
	        this.latestVersion = source["latestVersion"];
	        this.releaseName = source["releaseName"];
	        this.releaseNotes = source["releaseNotes"];
	        this.publishedAt = source["publishedAt"];
	        this.releaseUrl = source["releaseUrl"];
	        this.downloadUrl = source["downloadUrl"];
	        this.assetFileName = source["assetFileName"];
	        this.platform = source["platform"];
	    }
	}

}

export namespace volumes {
	
	export class Volume {
	    name: string;
	    driver: string;
	    mountpoint: string;
	    createdAt: string;
	    labels: Record<string, string>;
	    scope: string;
	    size: number;
	    formattedSize: string;
	
	    static createFrom(source: any = {}) {
	        return new Volume(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.driver = source["driver"];
	        this.mountpoint = source["mountpoint"];
	        this.createdAt = source["createdAt"];
	        this.labels = source["labels"];
	        this.scope = source["scope"];
	        this.size = source["size"];
	        this.formattedSize = source["formattedSize"];
	    }
	}

}

