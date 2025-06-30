
export class UserUtils {
  /**
   * Build user display name from various field combinations
   */
  static buildDisplayName(user: any): string {
    // Try different name field combinations
    if (user.name && user.name.trim()) {
      return user.name.trim();
    }
    
    if (user.first_name || user.last_name) {
      return `${user.first_name || ""} ${user.last_name || ""}`.trim();
    }
    
    if (user.username && user.username.trim()) {
      return user.username.trim();
    }
    
    if (user.email) {
      return user.email.split("@")[0];
    }
    
    return "Unknown User";
  }

  /**
   * Extract domain user from various formats
   */
  static extractDomainUser(userString: string): string {
    if (!userString) return "";
    
    // Handle domain\username format
    if (userString.includes("\\")) {
      return userString.split("\\").pop() || "";
    }
    
    // Handle email format
    if (userString.includes("@")) {
      return userString.split("@")[0];
    }
    
    return userString;
  }

  /**
   * Filter out system accounts from user strings
   */
  static isSystemAccount(username: string): boolean {
    if (!username || typeof username !== "string") return true;
    
    const systemPatterns = [
      "NT AUTHORITY",
      "SYSTEM",
      "LOCAL SERVICE",
      "NETWORK SERVICE",
      "Window Manager",
      "Unknown",
      "N/A"
    ];
    
    return (
      systemPatterns.some(pattern => username.includes(pattern)) ||
      username.endsWith("$") ||
      username.trim() === ""
    );
  }

  /**
   * Extract real user from process list
   */
  static extractUserFromProcesses(processes: any[]): string | null {
    if (!Array.isArray(processes)) return null;
    
    const userProcesses = processes.filter(process => {
      const processUser = process.username || process.user;
      return processUser && !this.isSystemAccount(processUser);
    });
    
    if (userProcesses.length === 0) return null;
    
    const firstUserProcess = userProcesses[0];
    const username = firstUserProcess.username || firstUserProcess.user;
    
    return this.extractDomainUser(username);
  }

  /**
   * Normalize user data object
   */
  static normalizeUserData(user: any) {
    return {
      ...user,
      name: this.buildDisplayName(user),
      email: user.email?.toLowerCase() || "",
      role: user.role || "user",
      department: user.department || user.location || "",
      phone: user.phone || "",
      is_active: user.is_active !== undefined ? user.is_active : true
    };
  }

  /**
   * Get user initials for avatar
   */
  static getUserInitials(user: any): string {
    const name = this.buildDisplayName(user);
    const parts = name.split(" ");
    
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    } else if (parts.length === 1 && parts[0].length >= 2) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    
    return "UN"; // Unknown
  }

  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Format user role for display
   */
  static formatRole(role: string): string {
    const roleMap: { [key: string]: string } = {
      admin: "Administrator",
      manager: "Manager",
      technician: "Technician",
      user: "End User",
      end_user: "End User"
    };
    
    return roleMap[role] || role.charAt(0).toUpperCase() + role.slice(1);
  }
}
