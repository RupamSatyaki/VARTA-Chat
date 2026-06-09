import { Ionicons } from '@expo/vector-icons';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

export interface User {
  _id: string;
  name?: string;
  number: string;
  profilePic?: string;
  status?: string;
}

export interface Chat {
  _id: string;
  chatName: string;
  isGroupChat: boolean;
  users: User[];
  groupAdmin: User | string;
  description?: string;
  groupProfilePic?: string;
  createdAt: string;
}
