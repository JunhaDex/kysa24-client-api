import { Controller, Param, Post, Res } from '@nestjs/common';

@Controller('upload')
export class UploadController {
  constructor() {}

  @Post(':type/:id')
  async uploadPostMedia(
    @Param('type') mediaType: string,
    @Param('id') id: string,
    @Res() res: any,
  ) {
    return 'uploadPostMedia';
  }
}
