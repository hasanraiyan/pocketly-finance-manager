import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { clerkClient } from '@clerk/express';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async findOrCreateByClerkId(clerkUserId: string): Promise<UserDocument> {
    const existing = await this.userModel.findOne({ clerkUserId }).exec();
    if (existing) {
      return existing;
    }

    const clerkUser = await clerkClient.users.getUser(clerkUserId);
    const email =
      clerkUser.emailAddresses.find(
        (e) => e.id === clerkUser.primaryEmailAddressId,
      )?.emailAddress ??
      clerkUser.emailAddresses[0]?.emailAddress ??
      '';
    const name =
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') ||
      email;

    return this.userModel.create({
      clerkUserId,
      email,
      name,
      imageUrl: clerkUser.imageUrl,
    });
  }
}
