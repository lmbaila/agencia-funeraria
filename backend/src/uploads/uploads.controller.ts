import { BadRequestException, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { documentUploadOptions } from '../common/utils/upload.util';

/**
 * Upload do documento de identificação (BI/Passaporte) do cliente.
 * Público porque é usado tanto na adesão online como no registo presencial,
 * antes de o cliente ainda existir na base de dados — por isso tem o seu próprio
 * limite de pedidos por IP, para não ficar aberto a um envio ilimitado e anónimo de ficheiros.
 */
@ApiTags('uploads')
@UseGuards(ThrottlerGuard)
@Controller('uploads')
export class UploadsController {
  @Post('client-document')
  @UseInterceptors(FileInterceptor('file', documentUploadOptions))
  upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Nenhum ficheiro enviado.');
    return {
      path: `documents/${file.filename}`,
      mimeType: file.mimetype,
      originalName: file.originalname,
      size: file.size,
    };
  }

  /**
   * Upload da certidão de óbito. Público pela mesma razão do documento do cliente: a família
   * pode anexá-la na comunicação de óbito online, antes de o sinistro existir na base de dados.
   */
  @Post('claim-document')
  @UseInterceptors(FileInterceptor('file', documentUploadOptions))
  uploadClaimDocument(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Nenhum ficheiro enviado.');
    return {
      path: `documents/${file.filename}`,
      mimeType: file.mimetype,
      originalName: file.originalname,
      size: file.size,
    };
  }
}
