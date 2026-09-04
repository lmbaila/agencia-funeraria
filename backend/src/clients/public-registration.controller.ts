import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';

/**
 * Endpoints públicos, sem autenticação, usados pela Landing Page para a adesão online.
 */
@ApiTags('public')
@Controller('public')
export class PublicRegistrationController {
  constructor(private clientsService: ClientsService) {}

  @Post('register')
  register(@Body() dto: CreateClientDto) {
    return this.clientsService.registerClientWithContract(dto, 'ONLINE');
  }

  /** Usado pelo formulário de adesão para avisar em tempo real se o número já está registado. */
  @Get('check-availability')
  checkAvailability(@Query('documentNumber') documentNumber?: string, @Query('phone') phone?: string) {
    return this.clientsService.checkAvailability(documentNumber, phone);
  }

  /** Usado pelo formulário de adesão para confirmar, em tempo real, se o identificador de
   * acesso sugerido (ou editado à mão) é válido e ainda está livre. */
  @Get('check-identifier')
  checkIdentifierAvailable(@Query('identifier') identifier: string) {
    return this.clientsService.checkIdentifierAvailable(identifier);
  }
}
