
// This file has been removed as part of AD integration cleanup
// All AD functionality has been migrated to local authentication
export const adService = null;
export class ActiveDirectoryService {
  constructor() {
    throw new Error('Active Directory integration has been disabled');
  }
}
