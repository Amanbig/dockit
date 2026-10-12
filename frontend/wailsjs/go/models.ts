export namespace containers {
	
	export class Container {
	    id: string;
	    name: string;
	    image: string;
	    status: string;
	    state: string;
	    ports: string[];
	
	    static createFrom(source: any = {}) {
	        return new Container(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.image = source["image"];
	        this.status = source["status"];
	        this.state = source["state"];
	        this.ports = source["ports"];
	    }
	}

}

