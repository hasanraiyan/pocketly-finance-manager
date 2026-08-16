import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/auth/current-user.decorator';
import type { UserDocument } from '../users/schemas/user.schema';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@ApiTags('categories')
@ApiBearerAuth('clerk')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  create(@CurrentUser() user: UserDocument, @Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(user._id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: UserDocument) {
    return this.categoriesService.findAll(user._id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: UserDocument, @Param('id') id: string) {
    return this.categoriesService.findOne(user._id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: UserDocument,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(user._id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: UserDocument, @Param('id') id: string) {
    return this.categoriesService.remove(user._id, id);
  }
}
