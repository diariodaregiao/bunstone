import "reflect-metadata";
import {
	Application,
	Controller,
	Get,
	Module,
	StorageModule,
	StorageService,
} from "@grupodiariodaregiao/bunstone";

@Controller()
class AppController {
	constructor(private readonly storage: StorageService) {}

	// presigning is local: the app is measured without a storage server
	@Get()
	link() {
		return { url: this.storage.presign("reports/latest.pdf") };
	}
}

@Module({
	imports: [
		StorageModule.register({
			endpoint: "http://storage.invalid:9000",
			accessKeyId: "key",
			secretAccessKey: "secret",
			bucket: "reports",
		}),
	],
	controllers: [AppController],
})
class AppModule {}

const app = await Application.create(AppModule, { logStartup: false, gracefulShutdown: false });
const booted = performance.now();
app.listen(0);
const res = await fetch(app.getServer()!.url);
const body = await res.json();
await app.close();
console.log(JSON.stringify({ ok: res.status === 200 && body.url.includes("X-Amz-Signature="), booted, rss: process.memoryUsage().rss }));
