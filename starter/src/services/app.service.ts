import { Injectable } from "@grupodiariodaregiao/bunstone";

@Injectable()
export class AppService {
  getHello() {
    return {
      message: "Hello from Bunstone!",
      timestamp: new Date().toISOString(),
    };
  }
}
