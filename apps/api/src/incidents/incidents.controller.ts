import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { IncidentStatus } from '@prisma/client';
import { AuthenticatedRequest, SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CsrfGuard } from '../auth/guards/csrf.guard';
import { TransitionIncidentDto } from './dto/transition-incident.dto';
import { ResolveIncidentDto } from './dto/resolve-incident.dto';
import { IncidentsService } from './incidents.service';

@Controller('incidents')
@UseGuards(SessionAuthGuard, RolesGuard, CsrfGuard)
@Roles('OWNER', 'ADMIN', 'STAFF')
export class IncidentsController {
  constructor(private readonly incidents: IncidentsService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest, @Query('status') status?: IncidentStatus) { return this.incidents.list(request.user!, status); }

  @Get(':id')
  get(@Req() request: AuthenticatedRequest, @Param('id') id: string) { return this.incidents.get(request.user!, id); }

  @Post(':id/acknowledge')
  acknowledge(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() body: TransitionIncidentDto) { return this.incidents.acknowledge(request.user!, id, body.expectedVersion); }

  @Post(':id/resolve')
  resolve(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() body: ResolveIncidentDto) { return this.incidents.resolve(request.user!, id, body); }

  @Post(':id/dismiss')
  dismiss(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() body: TransitionIncidentDto) { return this.incidents.dismiss(request.user!, id, body.expectedVersion); }
}

