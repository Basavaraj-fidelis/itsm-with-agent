
import { Client } from 'ldapjs';
import bcrypt from 'bcryptjs';

interface ADConfig {
  url: string;
  bindDN: string;
  bindCredentials: string;
  searchBase: string;
  searchFilter: string;
  searchAttributes: string[];
}

interface ADUser {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  department: string;
  title: string;
  groups: string[];
}

export class ActiveDirectoryService {
  private config: ADConfig;

  constructor() {
    this.config = {
      url: process.env.AD_URL || 'ldap://your-domain-controller.company.com:389',
      bindDN: process.env.AD_BIND_DN || 'CN=service-account,OU=Service Accounts,DC=company,DC=com',
      bindCredentials: process.env.AD_BIND_PASSWORD || 'service-password',
      searchBase: process.env.AD_SEARCH_BASE || 'OU=Users,DC=company,DC=com',
      searchFilter: process.env.AD_SEARCH_FILTER || '(sAMAccountName={{username}})',
      searchAttributes: [
        'sAMAccountName',
        'mail',
        'givenName',
        'sn',
        'displayName',
        'department',
        'title',
        'memberOf',
        'userPrincipalName'
      ]
    };
  }

  async authenticateUser(username: string, password: string): Promise<ADUser | null> {
    const client = new Client({ url: this.config.url });

    try {
      // First, bind with service account
      await new Promise((resolve, reject) => {
        client.bind(this.config.bindDN, this.config.bindCredentials, (err) => {
          if (err) reject(err);
          else resolve(true);
        });
      });

      // Search for the user
      const searchFilter = this.config.searchFilter.replace('{{username}}', username);
      const searchOptions = {
        filter: searchFilter,
        scope: 'sub',
        attributes: this.config.searchAttributes
      };

      const searchResult = await new Promise<any>((resolve, reject) => {
        const entries: any[] = [];
        
        client.search(this.config.searchBase, searchOptions, (err, res) => {
          if (err) {
            reject(err);
            return;
          }

          res.on('searchEntry', (entry) => {
            entries.push(entry.object);
          });

          res.on('error', (err) => {
            reject(err);
          });

          res.on('end', (result) => {
            if (entries.length === 0) {
              reject(new Error('User not found'));
            } else {
              resolve(entries[0]);
            }
          });
        });
      });

      // Try to authenticate the user with their password
      const userDN = searchResult.dn;
      await new Promise((resolve, reject) => {
        client.bind(userDN, password, (err) => {
          if (err) reject(new Error('Invalid credentials'));
          else resolve(true);
        });
      });

      // Parse user information
      const adUser: ADUser = {
        username: searchResult.sAMAccountName || searchResult.userPrincipalName,
        email: searchResult.mail,
        firstName: searchResult.givenName || '',
        lastName: searchResult.sn || '',
        displayName: searchResult.displayName || '',
        department: searchResult.department || '',
        title: searchResult.title || '',
        groups: Array.isArray(searchResult.memberOf) ? searchResult.memberOf : [searchResult.memberOf || '']
      };

      return adUser;

    } catch (error) {
      console.error('AD Authentication error:', error);
      return null;
    } finally {
      client.unbind();
    }
  }

  async syncUserToDatabase(adUser: ADUser): Promise<any> {
    try {
      const { storage } = await import('./storage');
      
      // Check if user already exists
      let existingUser = await storage.getUserByEmail(adUser.email);
      
      if (existingUser) {
        // Update existing user
        const updatedUser = await storage.updateUser(existingUser.id, {
          name: adUser.displayName || `${adUser.firstName} ${adUser.lastName}`.trim(),
          department: adUser.department,
          role: this.mapADGroupsToRole(adUser.groups),
          is_active: true,
          updated_at: new Date()
        });
        return updatedUser;
      } else {
        // Create new user
        const newUser = await storage.createUser({
          name: adUser.displayName || `${adUser.firstName} ${adUser.lastName}`.trim(),
          email: adUser.email,
          password_hash: await bcrypt.hash(Math.random().toString(), 10), // Dummy password for AD users
          role: this.mapADGroupsToRole(adUser.groups),
          department: adUser.department,
          phone: '',
          is_active: true
        });
        return newUser;
      }
    } catch (error) {
      console.error('Error syncing AD user to database:', error);
      throw error;
    }
  }

  private mapADGroupsToRole(groups: string[]): string {
    // Map AD groups to ITSM roles
    const groupMappings = {
      'CN=ITSM-Admins,OU=Groups,DC=company,DC=com': 'admin',
      'CN=ITSM-Managers,OU=Groups,DC=company,DC=com': 'manager',
      'CN=ITSM-Technicians,OU=Groups,DC=company,DC=com': 'technician',
      'CN=IT-Support,OU=Groups,DC=company,DC=com': 'technician',
      'CN=Help-Desk,OU=Groups,DC=company,DC=com': 'technician'
    };

    for (const group of groups) {
      if (groupMappings[group]) {
        return groupMappings[group];
      }
    }

    // Default role for AD authenticated users
    return 'end_user';
  }

  async validateConnection(): Promise<boolean> {
    const client = new Client({ url: this.config.url });

    try {
      await new Promise((resolve, reject) => {
        client.bind(this.config.bindDN, this.config.bindCredentials, (err) => {
          if (err) reject(err);
          else resolve(true);
        });
      });
      
      client.unbind();
      return true;
    } catch (error) {
      console.error('AD Connection validation failed:', error);
      return false;
    }
  }
}

export const adService = new ActiveDirectoryService();
