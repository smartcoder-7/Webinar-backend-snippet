import { EntityRepository, Repository } from 'typeorm';

import { v4 as uuid } from 'uuid';
import { Token } from './entities/Token';

@EntityRepository(Token)
export class TokenRepository extends Repository<Token> {
  public async generateResetToken(
    expiresAt: Date,
    targetType: string,
    targetID: string,
    tokenType: string
  ) {
    await this.clearOldResetToken(targetID);
    const randomToken = await this.generateToken();
    const token = this.create({
      token: randomToken,
      expiresAt,
      targetType,
      targetID,
      tokenType,
    });
    return this.save(token);
  }

  private async generateToken() {
    let randomToken = uuid();
    let token = await this.findOne({ token: randomToken });
    while (token) {
      randomToken = uuid();
      token = await this.findOne({ token: randomToken });
    }
    return randomToken;
  }

  private async clearOldResetToken(userId: string) {
    await this.delete({
      targetID: userId,
      tokenType: 'reset-password',
    });
  }
}
