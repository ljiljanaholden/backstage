/*
 * Copyright 2022 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

//  * Copyright 2021 The Backstage Authors
//  *
//  * Licensed under the Apache License, Version 2.0 (the "License");
//  * you may not use this file except in compliance with the License.
//  * You may obtain a copy of the License at
//  *
//  *     http://www.apache.org/licenses/LICENSE-2.0
//  *
//  * Unless required by applicable law or agreed to in writing, software
//  * distributed under the License is distributed on an "AS IS" BASIS,
//  * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  * See the License for the specific language governing permissions and
//  * limitations under the License.
//  */
import { getRootLogger } from '@backstage/backend-common';
import { ConfigReader } from '@backstage/config';
import { ScmIntegrations } from '@backstage/integration';
import mockFs from 'mock-fs';
import os from 'os';
import { resolve as resolvePath } from 'path';
import { Writable } from 'stream';
import { TemplateAction } from '../../types';
import { createPublishGitlabMergeRequestAction } from './gitlabMergeRequest';

const root = os.platform() === 'win32' ? 'C:\\root' : '/root';
const workspacePath = resolvePath(root, 'my-workspace');

const mockGitlabClient = {
  Namespaces: {
    show: jest.fn(),
  },
  Branches: {
    create: jest.fn(),
  },
  Commits: {
    create: jest.fn(),
  },
  MergeRequests: {
    create: jest.fn(async (_: any) => {
      return {
        default_branch: 'main',
      };
    }),
  },
  Projects: {
    create: jest.fn(),
    show: jest.fn(async (_: any) => {
      return {
        default_branch: 'main',
      };
    }),
  },
  Users: {
    current: jest.fn(),
  },
};

jest.mock('@gitbeaker/node', () => ({
  Gitlab: class {
    constructor() {
      return mockGitlabClient;
    }
  },
}));

/* jest.mock('globby', () =>
  jest.fn(async (_: any) => {
    return ['foo/bar5'];
  }),
);

jest.mock('p-limit', () =>
  jest.fn(async (_: any) => {
    return ['foo/bar5'];
  }),
);

jest.mock('fs-extra', () => {
  return {
    readFile: jest.fn(async (_: any) => {
      return Buffer.from('some content');
    }),
  };
});*/

describe('createGitLabMergeRequest', () => {
  let instance: TemplateAction<any>;

  beforeEach(() => {
    const config = new ConfigReader({
      integrations: {
        gitlab: [
          {
            host: 'gitlab.com',
            token: 'token',
            apiBaseUrl: 'https://api.gitlab.com',
          },
          {
            host: 'hosted.gitlab.com',
            apiBaseUrl: 'https://api.hosted.gitlab.com',
          },
        ],
      },
    });

    const integrations = ScmIntegrations.fromConfig(config);
    instance = createPublishGitlabMergeRequestAction({ integrations });
  });

  afterEach(() => {
    mockFs.restore();
  });

  describe('createGitLabMergeRequestWithoutCommitAction', () => {
    it('default commitAction is create', async () => {
      const input = {
        repoUrl: 'gitlab.com?repo=repo&owner=owner',
        title: 'Create my new MR',
        branchName: 'new-mr',
        description: 'This MR is really good',
        draft: true,
        targetPath: 'subdirectory',
      };
      mockFs({
        [workspacePath]: {
          source: { 'foo.txt': 'Hello there!' },
          irrelevant: { 'bar.txt': 'Nothing to see here' },
        },
      });
      const ctx = {
        createTemporaryDirectory: jest.fn(),
        output: jest.fn(),
        logger: getRootLogger(),
        logStream: new Writable(),
        input,
        workspacePath,
      };
      await instance.handler(ctx);

      expect(mockGitlabClient.Commits.create).toHaveBeenCalledWith(
        'owner/repo',
        'new-mr',
        'Create my new MR',
        [
          {
            action: 'create',
            filePath: 'foo/bar5',
            content: 'some content',
          },
        ],
      );
    });
  });

  describe('createGitLabMergeRequestWithCommitAction', () => {
    it('commitAction is create when create is passed in options', async () => {
      const input = {
        repoUrl: 'gitlab.com?repo=repo&owner=owner',
        title: 'Create my new MR',
        branchName: 'new-mr',
        description: 'MR description',
        commitAction: 'create',
        draft: true,
        targetPath: 'subdirectory',
      };
      mockFs({
        [workspacePath]: {
          source: { 'foo.txt': 'Hello there!' },
          irrelevant: { 'bar.txt': 'Nothing to see here' },
        },
      });

      const ctx = {
        createTemporaryDirectory: jest.fn(),
        output: jest.fn(),
        logger: getRootLogger(),
        logStream: new Writable(),
        input,
        workspacePath,
      };
      await instance.handler(ctx);

      expect(mockGitlabClient.Commits.create).toHaveBeenCalledWith(
        'owner/repo',
        'new-mr',
        'Create my new MR',
        [
          {
            action: 'create',
            filePath: 'foo/bar5',
            content: 'some content',
          },
        ],
      );
    });

    it('commitAction is update when update is passed in options', async () => {
      const input = {
        repoUrl: 'gitlab.com?repo=repo&owner=owner',
        title: 'Create my new MR',
        branchName: 'new-mr',
        description: 'MR description',
        commitAction: 'update',
        draft: true,
        targetPath: 'subdirectory',
      };
      mockFs({
        [workspacePath]: {
          source: { 'foo.txt': 'Hello there!' },
          irrelevant: { 'bar.txt': 'Nothing to see here' },
        },
      });

      const ctx = {
        createTemporaryDirectory: jest.fn(),
        output: jest.fn(),
        logger: getRootLogger(),
        logStream: new Writable(),
        input,
        workspacePath,
      };
      await instance.handler(ctx);

      expect(mockGitlabClient.Commits.create).toHaveBeenCalledWith(
        'owner/repo',
        'new-mr',
        'Create my new MR',
        [
          {
            action: 'update',
            filePath: 'foo/bar5',
            content: 'some content',
          },
        ],
      );
    });

    it('commitAction is delete when delete is passed in options', async () => {
      const input = {
        repoUrl: 'gitlab.com?repo=repo&owner=owner',
        title: 'Create my new MR',
        branchName: 'new-mr',
        description: 'other MR description',
        commitAction: 'delete',
        draft: true,
        targetPath: 'subdirectory',
      };
      mockFs({
        [workspacePath]: {
          source: { 'foo.txt': 'Hello there!' },
          irrelevant: { 'bar.txt': 'Nothing to see here' },
        },
      });

      const ctx = {
        createTemporaryDirectory: jest.fn(),
        output: jest.fn(),
        logger: getRootLogger(),
        logStream: new Writable(),
        input,
        workspacePath,
      };
      await instance.handler(ctx);

      expect(mockGitlabClient.Commits.create).toHaveBeenCalledWith(
        'owner/repo',
        'new-mr',
        'Create my new MR',
        [
          {
            action: 'delete',
            filePath: 'foo/bar5',
          },
        ],
      );
    });
  });
});
