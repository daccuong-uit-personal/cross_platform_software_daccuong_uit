import { IsString, IsOptional, IsUrl, MinLength, MaxLength, Matches } from 'class-validator';

export class CreateProfileDto {
  @IsString()
  userId!: string; // Provided by gateway after auth verification

  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_]+$/, { message: 'Username can only contain letters, numbers, and underscores' })
  username!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  displayName?: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  bio?: string;

  @IsOptional()
  @IsUrl()
  avatarUrl?: string;
}
