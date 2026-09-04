import { Module } from '@nestjs/common';
import { AddressLookupService } from './address-lookup.service';
import { AddressLookupController } from './address-lookup.controller';

@Module({
  providers: [AddressLookupService],
  controllers: [AddressLookupController],
})
export class AddressLookupModule {}
