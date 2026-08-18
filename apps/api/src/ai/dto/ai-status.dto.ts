import { ApiProperty } from '@nestjs/swagger';

export class AiStatusResponseDto {
  @ApiProperty({ example: true })
  enabled!: boolean;

  @ApiProperty({ example: 'persona' })
  provider!: string;

  @ApiProperty({ example: '674ef1a0...', nullable: true })
  defaultAgentId!: string | null;

  @ApiProperty({ example: '0.5.1' })
  runtimeVersion!: string;
}
