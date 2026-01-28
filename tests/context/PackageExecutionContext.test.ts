import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PackageExecutionContext, PackageContextFactory } from '../../src/context/PackageExecutionContext.js';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';

describe('PackageExecutionContext', () => {
  let testDir: string;
  
  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'kodrdriv-test-'));
  });
  
  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });
  
  describe('repository detection', () => {
    it('should detect repository information from git remote', () => {
      // Setup: Create a git repo with remote
      execSync('git init', { cwd: testDir });
      execSync('git remote add origin git@github.com:test-org/test-repo.git', { cwd: testDir });
      
      // Execute: Create context
      const context = new PackageExecutionContext({
        packageName: '@test/package',
        packagePath: testDir,
        workingDirectory: testDir,
      });
      
      // Assert: Repository info is correct
      expect(context.repositoryOwner).toBe('test-org');
      expect(context.repositoryName).toBe('test-repo');
      expect(context.repositoryUrl).toBe('https://github.com/test-org/test-repo');
    });
    
    it('should handle HTTPS remote URLs', () => {
      execSync('git init', { cwd: testDir });
      execSync('git remote add origin https://github.com/test-org/test-repo.git', { cwd: testDir });
      
      const context = new PackageExecutionContext({
        packageName: '@test/package',
        packagePath: testDir,
        workingDirectory: testDir,
      });
      
      expect(context.repositoryOwner).toBe('test-org');
      expect(context.repositoryName).toBe('test-repo');
    });
    
    it('should handle HTTPS URLs without .git suffix', () => {
      execSync('git init', { cwd: testDir });
      execSync('git remote add origin https://github.com/test-org/test-repo', { cwd: testDir });
      
      const context = new PackageExecutionContext({
        packageName: '@test/package',
        packagePath: testDir,
        workingDirectory: testDir,
      });
      
      expect(context.repositoryOwner).toBe('test-org');
      expect(context.repositoryName).toBe('test-repo');
    });
    
    it('should throw error if not a git repository', () => {
      expect(() => {
        new PackageExecutionContext({
          packageName: '@test/package',
          packagePath: testDir,
          workingDirectory: testDir,
        });
      }).toThrow(/Failed to detect repository/);
    });
    
    it('should throw error if remote URL is invalid', () => {
      execSync('git init', { cwd: testDir });
      execSync('git remote add origin invalid-url', { cwd: testDir });
      
      expect(() => {
        new PackageExecutionContext({
          packageName: '@test/package',
          packagePath: testDir,
          workingDirectory: testDir,
        });
      }).toThrow(/Could not parse repository URL/);
    });
  });
  
  describe('validation', () => {
    it('should validate successfully for valid context', () => {
      execSync('git init', { cwd: testDir });
      execSync('git remote add origin git@github.com:test-org/test-repo.git', { cwd: testDir });
      
      const context = new PackageExecutionContext({
        packageName: '@test/package',
        packagePath: testDir,
        workingDirectory: testDir,
      });
      
      expect(() => context.validate()).not.toThrow();
    });
    
    it('should throw on invalid repository information', () => {
      execSync('git init', { cwd: testDir });
      execSync('git remote add origin git@github.com:test-org/test-repo.git', { cwd: testDir });
      
      const context = new PackageExecutionContext({
        packageName: '@test/package',
        packagePath: testDir,
        workingDirectory: testDir,
      });
      
      // Manually corrupt the context
      (context as any).repositoryUrl = '';
      
      expect(() => context.validate()).toThrow(/Context validation failed/);
      expect(() => context.validate()).toThrow(/Invalid repository information/);
    });
  });
  
  describe('toString', () => {
    it('should provide a useful string representation', () => {
      execSync('git init', { cwd: testDir });
      execSync('git remote add origin git@github.com:test-org/test-repo.git', { cwd: testDir });
      
      const context = new PackageExecutionContext({
        packageName: '@test/package',
        packagePath: testDir,
        workingDirectory: testDir,
      });
      
      const str = context.toString();
      expect(str).toContain('@test/package');
      expect(str).toContain('test-org');
      expect(str).toContain('test-repo');
    });
  });
});

describe('PackageContextFactory', () => {
  let testDir1: string;
  let testDir2: string;
  
  beforeEach(() => {
    testDir1 = mkdtempSync(join(tmpdir(), 'kodrdriv-test-1-'));
    testDir2 = mkdtempSync(join(tmpdir(), 'kodrdriv-test-2-'));
  });
  
  afterEach(() => {
    rmSync(testDir1, { recursive: true, force: true });
    rmSync(testDir2, { recursive: true, force: true });
  });
  
  describe('createContext', () => {
    it('should create a valid context', () => {
      execSync('git init', { cwd: testDir1 });
      execSync('git remote add origin git@github.com:test-org/test-repo.git', { cwd: testDir1 });
      
      const context = PackageContextFactory.createContext({
        name: '@test/package',
        path: testDir1,
      });
      
      expect(context.packageName).toBe('@test/package');
      expect(context.packagePath).toBe(testDir1);
      expect(context.repositoryOwner).toBe('test-org');
      expect(context.repositoryName).toBe('test-repo');
    });
    
    it('should validate context before returning', () => {
      // No git repo - should throw during validation
      expect(() => {
        PackageContextFactory.createContext({
          name: '@test/package',
          path: testDir1,
        });
      }).toThrow();
    });
  });
  
  describe('createContexts', () => {
    it('should create isolated contexts for multiple packages', () => {
      // Setup: Create two git repos with different remotes
      execSync('git init', { cwd: testDir1 });
      execSync('git remote add origin git@github.com:org1/repo1.git', { cwd: testDir1 });
      
      execSync('git init', { cwd: testDir2 });
      execSync('git remote add origin git@github.com:org2/repo2.git', { cwd: testDir2 });
      
      // Execute: Create contexts
      const contexts = PackageContextFactory.createContexts([
        { name: '@test/package1', path: testDir1 },
        { name: '@test/package2', path: testDir2 },
      ]);
      
      // Assert: Contexts are isolated
      expect(contexts.size).toBe(2);
      
      const ctx1 = contexts.get('@test/package1');
      expect(ctx1).toBeDefined();
      expect(ctx1!.repositoryOwner).toBe('org1');
      expect(ctx1!.repositoryName).toBe('repo1');
      
      const ctx2 = contexts.get('@test/package2');
      expect(ctx2).toBeDefined();
      expect(ctx2!.repositoryOwner).toBe('org2');
      expect(ctx2!.repositoryName).toBe('repo2');
    });
    
    it('should return empty map for empty input', () => {
      const contexts = PackageContextFactory.createContexts([]);
      expect(contexts.size).toBe(0);
    });
  });
});
