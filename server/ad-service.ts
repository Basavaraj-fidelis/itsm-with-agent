
import { Client } from 'ldapjs';
import bcrypt from 'bcryptjs';

interface ADConfig {
  enabled: boolean;
  url: string;
  bindDN: string;
  bindCredentials: string;
  searchBase: string;
  userFilter: string;
  groupFilter: string;
  useTLS: boolean;
  timeout: number;
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
  dn: string;
}

interface ADGroup {
  name: string;
  dn: string;
  description: string;
  members: string[];
}

export class ActiveDirectoryService {
  private config: ADConfig;

  constructor(customConfig?: Partial<ADConfig>) {
    this.config = {
      enabled: process.env.AD_ENABLED === 'true' || false,
      url: process.env.AD_URL || 'ldap://192.168.1.195:389',
      bindDN: process.env.AD_BIND_DN || 'CN=test,CN=Users,DC=fidelisgroup,DC=local',
      bindCredentials: process.env.AD_BIND_PASSWORD || 'Fidelis@123',
      searchBase: process.env.AD_SEARCH_BASE || 'CN=Users,DC=fidelisgroup,DC=local',
      userFilter: process.env.AD_USER_FILTER || '(sAMAccountName={{username}})',
      groupFilter: process.env.AD_GROUP_FILTER || '(objectClass=group)',
      useTLS: process.env.AD_USE_TLS === 'true' || false,
      timeout: parseInt(process.env.AD_TIMEOUT || '30000'),
      ...customConfig
    };
  }

  updateConfig(newConfig: Partial<ADConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  async testConnection(testConfig?: Partial<ADConfig>): Promise<{ connected: boolean; message: string; serverInfo?: any }> {
    const config = testConfig ? { ...this.config, ...testConfig } : this.config;
    
    const client = new Client({ 
      url: config.url,
      timeout: config.timeout,
      connectTimeout: config.timeout
    });

    try {
      // Test basic connection and authentication
      await new Promise<void>((resolve, reject) => {
        client.bind(config.bindDN, config.bindCredentials, (err) => {
          if (err) {
            reject(new Error(`Authentication failed: ${err.message}`));
          } else {
            resolve();
          }
        });
      });

      // Test search capability
      await new Promise<void>((resolve, reject) => {
        client.search(config.searchBase, {
          filter: '(objectClass=*)',
          scope: 'base',
          attributes: ['dn']
        }, (err, res) => {
          if (err) {
            reject(new Error(`Search test failed: ${err.message}`));
            return;
          }

          res.on('searchEntry', () => {
            resolve();
          });

          res.on('error', (error) => {
            reject(new Error(`Search error: ${error.message}`));
          });

          res.on('end', (result) => {
            if (result?.status !== 0) {
              reject(new Error('Search test failed - no results'));
            }
          });
        });
      });

      client.unbind();
      
      return {
        connected: true,
        message: "Successfully connected to Active Directory",
        serverInfo: {
          domain: this.extractDomainFromDN(config.searchBase),
          version: "Active Directory"
        }
      };

    } catch (error) {
      client.unbind();
      console.error('AD Connection test failed:', error);
      return {
        connected: false,
        message: error.message || "Failed to connect to Active Directory"
      };
    }
  }

  async authenticateUser(username: string, password: string): Promise<ADUser | null> {
    if (!this.config.enabled) {
      throw new Error('Active Directory is not enabled');
    }

    const client = new Client({ url: this.config.url });

    try {
      // First, bind with service account
      await new Promise<void>((resolve, reject) => {
        client.bind(this.config.bindDN, this.config.bindCredentials, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Search for the user
      const searchFilter = this.config.userFilter.replace('{{username}}', username);
      const searchOptions = {
        filter: searchFilter,
        scope: 'sub',
        attributes: [
          'sAMAccountName',
          'mail',
          'givenName',
          'sn',
          'displayName',
          'department',
          'title',
          'memberOf',
          'userPrincipalName',
          'dn'
        ]
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

          res.on('end', () => {
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
      await new Promise<void>((resolve, reject) => {
        client.bind(userDN, password, (err) => {
          if (err) reject(new Error('Invalid credentials'));
          else resolve();
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
        groups: Array.isArray(searchResult.memberOf) ? searchResult.memberOf : [searchResult.memberOf || ''],
        dn: searchResult.dn
      };

      return adUser;

    } catch (error) {
      console.error('AD Authentication error:', error);
      return null;
    } finally {
      client.unbind();
    }
  }

  async getUserByUsername(username: string): Promise<ADUser | null> {
    if (!this.config.enabled) {
      throw new Error('Active Directory is not enabled');
    }

    const client = new Client({ url: this.config.url });

    try {
      // Bind with service account
      await new Promise<void>((resolve, reject) => {
        client.bind(this.config.bindDN, this.config.bindCredentials, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Search for the user
      const searchFilter = this.config.userFilter.replace('{{username}}', username);
      const searchOptions = {
        filter: searchFilter,
        scope: 'sub',
        attributes: [
          'sAMAccountName',
          'mail',
          'givenName',
          'sn',
          'displayName',
          'department',
          'title',
          'memberOf',
          'userPrincipalName',
          'dn'
        ]
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

          res.on('end', () => {
            if (entries.length === 0) {
              resolve(null);
            } else {
              resolve(entries[0]);
            }
          });
        });
      });

      if (!searchResult) {
        return null;
      }

      // Parse user information
      const adUser: ADUser = {
        username: searchResult.sAMAccountName || searchResult.userPrincipalName,
        email: searchResult.mail,
        firstName: searchResult.givenName || '',
        lastName: searchResult.sn || '',
        displayName: searchResult.displayName || '',
        department: searchResult.department || '',
        title: searchResult.title || '',
        groups: Array.isArray(searchResult.memberOf) ? searchResult.memberOf : [searchResult.memberOf || ''],
        dn: searchResult.dn
      };

      return adUser;

    } catch (error) {
      console.error('AD User lookup error:', error);
      return null;
    } finally {
      client.unbind();
    }
  }

  async getAllUsers(): Promise<ADUser[]> {
    if (!this.config.enabled) {
      throw new Error('Active Directory is not enabled');
    }

    const client = new Client({ url: this.config.url });

    try {
      // Bind with service account
      await new Promise<void>((resolve, reject) => {
        client.bind(this.config.bindDN, this.config.bindCredentials, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Search for all users
      const searchOptions = {
        filter: '(&(objectClass=user)(mail=*))', // Users with email addresses
        scope: 'sub',
        attributes: [
          'sAMAccountName',
          'mail',
          'givenName',
          'sn',
          'displayName',
          'department',
          'title',
          'memberOf',
          'userPrincipalName',
          'dn'
        ]
      };

      const searchResults = await new Promise<any[]>((resolve, reject) => {
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

          res.on('end', () => {
            resolve(entries);
          });
        });
      });

      // Parse user information
      const adUsers: ADUser[] = searchResults.map(result => ({
        username: result.sAMAccountName || result.userPrincipalName,
        email: result.mail,
        firstName: result.givenName || '',
        lastName: result.sn || '',
        displayName: result.displayName || '',
        department: result.department || '',
        title: result.title || '',
        groups: Array.isArray(result.memberOf) ? result.memberOf : [result.memberOf || ''],
        dn: result.dn
      }));

      return adUsers;

    } catch (error) {
      console.error('AD Users lookup error:', error);
      return [];
    } finally {
      client.unbind();
    }
  }

  async getGroups(): Promise<ADGroup[]> {
    if (!this.config.enabled) {
      throw new Error('Active Directory is not enabled');
    }

    const client = new Client({ url: this.config.url });

    try {
      // Bind with service account
      await new Promise<void>((resolve, reject) => {
        client.bind(this.config.bindDN, this.config.bindCredentials, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Search for groups
      const searchOptions = {
        filter: this.config.groupFilter,
        scope: 'sub',
        attributes: ['cn', 'dn', 'description', 'member']
      };

      const searchResults = await new Promise<any[]>((resolve, reject) => {
        const entries: any[] = [];
        
        client.search(this.config.searchBase.replace('OU=Users', 'OU=Groups'), searchOptions, (err, res) => {
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

          res.on('end', () => {
            resolve(entries);
          });
        });
      });

      // Parse group information
      const adGroups: ADGroup[] = searchResults.map(result => ({
        name: result.cn,
        dn: result.dn,
        description: result.description || '',
        members: Array.isArray(result.member) ? result.member : [result.member || '']
      }));

      return adGroups;

    } catch (error) {
      console.error('AD Groups lookup error:', error);
      return [];
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
      // IT Team - Admin and Technician roles
      'CN=IT-team,OU=Groups,DC=company,DC=com': 'admin',
      'CN=IT-Admins,OU=Groups,DC=company,DC=com': 'admin',
      'CN=IT-Support,OU=Groups,DC=company,DC=com': 'technician',
      'CN=IT-Helpdesk,OU=Groups,DC=company,DC=com': 'technician',
      
      // Finance Team - Manager role for leads, end_user for others
      'CN=Finance-team,OU=Groups,DC=company,DC=com': 'end_user',
      'CN=Finance-Managers,OU=Groups,DC=company,DC=com': 'manager',
      
      // HR Team - Manager role for leads, end_user for others
      'CN=HR-team,OU=Groups,DC=company,DC=com': 'end_user',
      'CN=HR-Managers,OU=Groups,DC=company,DC=com': 'manager',
      
      // Department specific groups
      'CN=Department-Managers,OU=Groups,DC=company,DC=com': 'manager',
      'CN=Team-Leads,OU=Groups,DC=company,DC=com': 'manager',
      
      // Legacy mappings (keeping for compatibility)
      'CN=ITSM-Admins,OU=Groups,DC=company,DC=com': 'admin',
      'CN=ITSM-Managers,OU=Groups,DC=company,DC=com': 'manager',
      'CN=ITSM-Technicians,OU=Groups,DC=company,DC=com': 'technician'
    };

    // Check for exact matches first
    for (const group of groups) {
      if (groupMappings[group]) {
        return groupMappings[group];
      }
    }

    // Check for partial matches (case-insensitive)
    for (const group of groups) {
      const groupLower = group.toLowerCase();
      
      // IT-team members get technician role by default
      if (groupLower.includes('it-team') || groupLower.includes('it-support')) {
        return 'technician';
      }
      
      // Any group with "admin" gets admin role
      if (groupLower.includes('admin')) {
        return 'admin';
      }
      
      // Any group with "manager" gets manager role
      if (groupLower.includes('manager') || groupLower.includes('lead')) {
        return 'manager';
      }
    }

    // Default role for AD authenticated users
    return 'end_user';
  }

  private extractDomainFromDN(dn: string): string {
    const dcParts = dn.match(/DC=([^,]+)/g);
    if (dcParts) {
      return dcParts.map(dc => dc.replace('DC=', '')).join('.');
    }
    return 'Unknown';
  }

  async validateConnection(): Promise<boolean> {
    const result = await this.testConnection();
    return result.connected;
  }
}

export const adService = new ActiveDirectoryService();
