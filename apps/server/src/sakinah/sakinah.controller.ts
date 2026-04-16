import { Controller, Get, Query } from "@nestjs/common";
import { Public } from "../auth/public.decorator";
import { SakinahService } from "./sakinah.service";
import { GetAudioUrlDto } from "./dto/get-audio-url.dto";

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
  async getAudioUrl(@Query() dto: GetAudioUrlDto) {
    return this.sakinahService.getAudioUrl(dto.reciterId, dto.surahNumber);
  }

  @Get("read-reflect")
  async getReadReflect(@Query("surahNumber") surahNumber: string) {
    return this.sakinahService.getReadReflect(Number(surahNumber));
  }
}