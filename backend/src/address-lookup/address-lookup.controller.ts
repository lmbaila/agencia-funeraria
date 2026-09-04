import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AddressLookupService } from './address-lookup.service';

/** Endpoint público — usado pelo formulário de adesão antes de existir sessão autenticada. */
@ApiTags('address-lookup')
@Controller('address-lookup')
export class AddressLookupController {
  constructor(private readonly addressLookupService: AddressLookupService) {}

  @Get('search')
  search(@Query('q') q?: string) {
    return this.addressLookupService.search(q ?? '');
  }
}
