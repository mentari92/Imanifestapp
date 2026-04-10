import { Controller, Get, Query } from "@nestjs/common";
import { Public } from "../auth/public.decorator";
import { SakinahService } from "./sakinah.service";

@Controller("sakinah")
@Public()
export class SakinahController {
  constructor(private readonly sakinahService: SakinahService) {}

  @Get("reciters")
  async getReciters() {
    return this.sakinahService.getReciters();
  }

  @Get("surahs")
  async getSurahs() {
    return this.sakinahService.getSurahs();
  }

  @Get("audio")
  async getAudioUrl(
    @Query("reciterId") reciterId: string,
    @Query("surahNumber") surahNumber: string,
  ) {
    return this.sakinahService.getAudioUrl(
      parseInt(reciterId, 10) || 7,
      parseInt(surahNumber, 10) || 1,
    );
  }
}