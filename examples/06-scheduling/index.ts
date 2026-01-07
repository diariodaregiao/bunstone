import { Module, Injectable, Cron, Timeout, AppStartup } from "../../index";

@Injectable()
class NotificationTask {
  @Cron("*/10 * * * * *") // Every 10 seconds
  handleCron() {
    console.log("[Schedule] Running periodic notification check...");
  }

  @Timeout(5000) // 5 seconds after startup
  handleTimeout() {
    console.log("[Schedule] App has been running for 5 seconds!");
  }
}

@Module({
  providers: [NotificationTask],
})
class AppModule {}

const app = AppStartup.create(AppModule);
app.listen(3000, () => {
  console.log("Scheduling example is running on http://localhost:3000");
});
