import { Controller, Get, Request } from "@nestjs/common";
import { DashboardService } from "./dashboard.service";

@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("overview")
  getOverview(@Request() req: { user: { userId: string } }) {
    return this.dashboardService.getOverview(req.user.userId);
  }
}