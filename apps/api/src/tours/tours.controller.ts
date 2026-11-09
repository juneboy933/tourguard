import { Body, Controller, Get, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { TourStatus } from '@prisma/client';
import { AuthenticatedRequest, SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CsrfGuard } from '../auth/guards/csrf.guard';
import { AssignGuideDto } from './dto/assign-guide.dto';
import { CancelTourDto } from './dto/cancel-tour.dto';
import { CreateTourDto } from './dto/create-tour.dto';
import { RegisterGuestDto } from './dto/register-guest.dto';
import { UpdateTourDto } from './dto/update-tour.dto';
import { ToursService } from './tours.service';

@Controller('tours')
@UseGuards(SessionAuthGuard, RolesGuard, CsrfGuard)
@Roles('OWNER', 'ADMIN', 'STAFF')
export class ToursController {
  constructor(private readonly toursService: ToursService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest, @Query('status') status?: TourStatus) {
    return this.toursService.list(request.user!, status);
  }

  @Post()
  create(@Req() request: AuthenticatedRequest, @Body() body: CreateTourDto) {
    return this.toursService.create(request.user!, body);
  }

  @Get(':id')
  get(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.toursService.get(request.user!, id);
  }

  @Patch(':id')
  update(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() body: UpdateTourDto) {
    return this.toursService.update(request.user!, id, body);
  }

  @Put(':id/guide')
  assignGuide(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() body: AssignGuideDto) {
    return this.toursService.assignGuide(request.user!, id, body.guideUserId);
  }

  @Post(':id/guests')
  registerGuest(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() body: RegisterGuestDto) {
    return this.toursService.registerGuest(request.user!, id, body);
  }

  @Post(':id/activate')
  activate(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.toursService.activate(request.user!, id);
  }

  @Post(':id/complete')
  complete(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.toursService.complete(request.user!, id);
  }

  @Post(':id/cancel')
  cancel(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() body: CancelTourDto) {
    void body;
    return this.toursService.cancel(request.user!, id);
  }
}
