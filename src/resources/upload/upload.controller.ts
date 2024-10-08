import crypto from 'node:crypto';
import stream from 'node:stream';
import { Controller, HttpStatus, Param, Post, Req, Res } from '@nestjs/common';
import { formatResponse } from '@/utils/index.util';
import { UpKind, UpResource } from '@/resources/upload/upload.type';
import { getBucket } from '@/providers/firebase.provider';
import sharp from 'sharp';

@Controller('upload')
export class UploadController {
  constructor() {}

  @Post('user/:kind/:ref')
  async uploadUserMedia(
    @Param('kind') kind: UpKind,
    @Param('ref') ref: string,
    @Req() req: any,
    @Res() res: any,
  ) {
    if (this.verifyMediaKind('user', kind)) {
      const file = await req.file();
      const filename = this.getFileName(ref, file.filename);
      const buffer = await file.toBuffer();
      const location = await this.uploadMedia(buffer, filename, 'user', kind);
      return res
        .status(HttpStatus.OK)
        .send(formatResponse(HttpStatus.OK, { location }));
    }
    return res.status(HttpStatus.BAD_REQUEST).send(
      formatResponse(HttpStatus.BAD_REQUEST, {
        message: 'Invalid media kind',
      }),
    );
  }

  @Post('group/:kind/:ref')
  async uploadGroupMedia(
    @Param('kind') kind: UpKind,
    @Param('ref') ref: string,
    @Req() req: any,
    @Res() res: any,
  ) {
    if (this.verifyMediaKind('group', kind)) {
      const file = await req.file();
      const filename = this.getFileName(ref, file.filename);
      const buffer = await file.toBuffer();
      const location = await this.uploadMedia(buffer, filename, 'group', kind);
      return res
        .status(HttpStatus.OK)
        .send(formatResponse(HttpStatus.OK, { location }));
    }
    return res.status(HttpStatus.BAD_REQUEST).send(
      formatResponse(HttpStatus.BAD_REQUEST, {
        message: 'Invalid media kind',
      }),
    );
  }

  @Post('post/:ref')
  async uploadPostMedia(
    @Param('ref') ref: string,
    @Req() req: any,
    @Res() res: any,
  ) {
    const file = await req.file();
    const filename = this.getFileName(ref, file.filename);
    const buffer = await file.toBuffer();
    const location = await this.uploadMedia(buffer, filename, 'post');
    return res
      .status(HttpStatus.OK)
      .send(formatResponse(HttpStatus.OK, { location }));
  }

  private verifyMediaKind(resource: UpResource, input: string): boolean {
    if (resource === 'user' || resource === 'group') {
      return ['profile', 'cover'].includes(input);
    }
  }

  private getFileName(ref: string, original?: string): string {
    // const sp = original.split('.');
    // const ext = sp.length > 1 ? '.' + sp[sp.length - 1] : '';
    const md5Ref = crypto.createHash('md5').update(ref).digest('hex');
    const unix = Math.floor(Date.now() / 1000);
    return `${md5Ref}_${unix}.webp`;
  }

  private uploadMedia(
    buffer: Buffer,
    filename: string,
    resource: UpResource,
    kind?: UpKind,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const bucket = getBucket();
      const remoteFilePath = `${resource}/${kind ?? ''}/${filename}`.replace(
        '//',
        '/',
      );
      const ratio = kind === 'cover' ? 16 / 9 : 1;
      this.cutAndResizeImage(buffer, ratio, 480)
        .then((resized) => {
          const blob = bucket.file(remoteFilePath);
          const blobStream = blob.createWriteStream();
          blobStream.on('error', (err) => {
            reject(err);
          });
          blobStream.on('finish', () => {
            const publicUrl = process.env.GCP_CDN_BASE_URL + remoteFilePath;
            resolve(publicUrl);
          });
          const bufferStream = new stream.Readable();
          bufferStream.push(resized);
          bufferStream.push(null);
          bufferStream.pipe(blobStream);
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  async cutAndResizeImage(
    inputBuffer: Buffer,
    aspectRatio: number,
    targetWidth: number,
  ) {
    try {
      const image = sharp(inputBuffer);
      const metadata = await image.metadata();
      const orientation = metadata.orientation;
      let { width, height } = metadata;
      if (orientation && orientation >= 5 && orientation <= 8) {
        [width, height] = [height, width];
      }

      // Calculate dimensions for cropping
      const currentRatio = width / height;
      let cropWidth, cropHeight;

      if (currentRatio > aspectRatio) {
        // Image is wider than target ratio, crop width
        cropHeight = height;
        cropWidth = Math.round(cropHeight * aspectRatio);
      } else {
        // Image is taller than target ratio, crop height
        cropWidth = width;
        cropHeight = Math.round(cropWidth / aspectRatio);
      }

      // Calculate resize height based on target width
      let resizeHeight = Math.round(targetWidth / aspectRatio);
      resizeHeight = Math.min(resizeHeight, cropHeight);

      // processed Buffer
      return await image
        .rotate()
        .extract({
          width: cropWidth,
          height: cropHeight,
          left: Math.round((width - cropWidth) / 2),
          top: Math.round((height - cropHeight) / 2),
        })
        .resize(targetWidth, resizeHeight)
        .toFormat('webp')
        .toBuffer();
    } catch (error) {
      console.error('Error processing image:', error);
      throw error;
    }
  }
}
