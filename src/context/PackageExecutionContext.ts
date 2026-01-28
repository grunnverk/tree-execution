import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { getLogger } from '../util/logger.js';

const logger = getLogger();

export interface PackageContextOptions {
  packageName: string;
  packagePath: string;
  workingDirectory: string;
}

export interface RepositoryInfo {
  url: string;
  owner: string;
  name: string;
  remote: string;
}

/**
 * Isolated execution context for a single package in tree operations.
 * Prevents state leakage between parallel package executions.
 */
export class PackageExecutionContext {
    readonly packageName: string;
    readonly packagePath: string;
    readonly workingDirectory: string;
    readonly repositoryUrl: string;
    readonly repositoryOwner: string;
    readonly repositoryName: string;
    readonly gitRemote: string;
  
    private _githubClient?: any; // Will be typed properly in step 06
  
    constructor(options: PackageContextOptions) {
        this.packageName = options.packageName;
        this.packagePath = resolve(options.packagePath);
        this.workingDirectory = resolve(options.workingDirectory);
    
        logger.debug(`Creating execution context for ${this.packageName}`);
        logger.debug(`  Package path: ${this.packagePath}`);
    
        // Detect repository information in isolation
        const repoInfo = this.detectRepositoryInfo();
        this.repositoryUrl = repoInfo.url;
        this.repositoryOwner = repoInfo.owner;
        this.repositoryName = repoInfo.name;
        this.gitRemote = repoInfo.remote;
    
        logger.debug(`  Repository: ${this.repositoryOwner}/${this.repositoryName}`);
    }
  
    /**
   * Detect repository information from this package's directory.
   * Uses the package path, not process.cwd(), to avoid contamination.
   */
    private detectRepositoryInfo(): RepositoryInfo {
        try {
            // Get git remote URL from package directory
            const remote = execSync('git config --get remote.origin.url', {
                cwd: this.packagePath,
                encoding: 'utf-8',
            }).trim();
      
            // Parse repository URL
            const match = remote.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
            if (!match) {
                throw new Error(`Could not parse repository URL: ${remote}`);
            }
      
            const [, owner, name] = match;
            const url = `https://github.com/${owner}/${name}`;
      
            return { url, owner, name, remote };
        } catch (error: any) {
            throw new Error(
                `Failed to detect repository for ${this.packageName} at ${this.packagePath}: ${error.message}`
            );
        }
    }
  
    /**
   * Validate that this context is being used correctly.
   * Throws if context appears contaminated or misused.
   */
    validate(): void {
        if (!this.repositoryUrl || !this.repositoryOwner || !this.repositoryName) {
            throw new Error(
                `Context validation failed for ${this.packageName}: Invalid repository information`
            );
        }
    
        if (!this.packagePath || !this.workingDirectory) {
            throw new Error(
                `Context validation failed for ${this.packageName}: Invalid paths`
            );
        }
    }
  
    /**
   * Get a string representation for logging.
   */
    toString(): string {
        return `PackageExecutionContext(${this.packageName} → ${this.repositoryOwner}/${this.repositoryName})`;
    }
}

/**
 * Factory for creating isolated execution contexts.
 */
export class PackageContextFactory {
    /**
   * Create an isolated execution context for a package.
   * Ensures repository detection happens in the correct directory.
   */
    static createContext(packageInfo: {
    name: string;
    path: string;
  }): PackageExecutionContext {
        const context = new PackageExecutionContext({
            packageName: packageInfo.name,
            packagePath: packageInfo.path,
            workingDirectory: packageInfo.path,
        });
    
        // Validate immediately
        context.validate();
    
        return context;
    }
  
    /**
   * Create contexts for multiple packages.
   * Each context is completely isolated.
   */
    static createContexts(packages: Array<{ name: string; path: string }>): Map<string, PackageExecutionContext> {
        const contexts = new Map<string, PackageExecutionContext>();
    
        for (const pkg of packages) {
            const context = this.createContext(pkg);
            contexts.set(pkg.name, context);
        }
    
        return contexts;
    }
}
