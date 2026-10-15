import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';

import { listAccessibleGitHubRepositories } from '@/redux-api/github';
import { selectGitHubWorkspaceConfig } from '@/redux-feature/githubWorkspaceSlice';
import { startGitHubInstall, useGitHubAccessToken } from '@/utils/hooks/githubAuthHooks';
import { confirm } from '@/utils/utils';

interface InstallationCheck {
  repository: string;
  token: string;
}

/** Prompts signed-in users to install/configure the GitHub App when no usable installation is available. */
export const useGitHubInstallationGuard = () => {
  const accessToken = useGitHubAccessToken();
  const githubWorkspaceConfig = useSelector(selectGitHubWorkspaceConfig);
  const lastCheckRef = useRef<InstallationCheck | null>(null);
  const configuredRepository =
    githubWorkspaceConfig.owner && githubWorkspaceConfig.repo
      ? `${githubWorkspaceConfig.owner}/${githubWorkspaceConfig.repo}`
      : '';

  useEffect(() => {
    if (!accessToken) {
      lastCheckRef.current = null;
      return;
    }

    const lastCheck = lastCheckRef.current;
    if (lastCheck?.token === accessToken && lastCheck.repository === configuredRepository) return;
    lastCheckRef.current = { token: accessToken, repository: configuredRepository };

    let cancelled = false;
    void listAccessibleGitHubRepositories()
      .then(async (repositories) => {
        if (cancelled) return;
        const hasRequiredInstallation = configuredRepository
          ? repositories.some((repository) => repository.fullName === configuredRepository)
          : repositories.length > 0;
        if (hasRequiredInstallation) return;

        const shouldInstall = await confirm({
          className: 'github-installation-dialog',
          header: 'GitHub App installation required',
          acceptLabel: 'Install GitHub App',
          rejectLabel: 'Not now',
          message: configuredRepository
            ? `The GitHub App cannot access ${configuredRepository}. Install it or update its repository access to continue.`
            : 'The GitHub App is not installed for any accessible repository. Install it to use a GitHub workspace.',
        });
        if (shouldInstall && !cancelled) startGitHubInstall();
      })
      .catch(() => {
        // Authentication and network errors are surfaced by the existing GitHub queries.
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, configuredRepository]);
};
