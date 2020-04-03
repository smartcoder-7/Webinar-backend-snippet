import { Column, Entity, PrimaryColumn } from 'typeorm';
import { IDType } from '../../../types/IDType';
import { UserRole } from '../../team/entities/TeamUserRelation';

@Entity()
export class LiveChatConnection {
  @PrimaryColumn()
  public connectionId!: IDType;

  @Column({ nullable: true })
  public attendeeId?: IDType;

  @Column({ nullable: true })
  public setId?: IDType;

  @Column({ nullable: true })
  public userId?: IDType;

  @Column({ nullable: true })
  public role?: UserRole;

  @Column({ nullable: true })
  public teamId?: IDType;

  @Column()
  public timeConnected!: Date;
}
