import * as Sentry from '@sentry/react';
import { useEffect } from 'react';
import {
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from 'react-router-dom';

function createSentry() {
  let enabled = false;
  const wrapped = {
    init() {
      // https://docs.sentry.io/platforms/javascript/guides/react/#configure
      Sentry.init({
        debug: BUILD_CONFIG.debug ?? false,
        environment: process.env.BUILD_TYPE ?? 'development',
        defaultIntegrations: [
          Sentry.reactRouterV6BrowserTracingIntegration({
            useEffect,
            useLocation,
            useNavigationType,
            createRoutesFromChildren,
            matchRoutes,
          }),
        ],
        beforeSend(event) {
          return enabled ? event : null;
        },
      });
      Sentry.setTags({
        distribution: BUILD_CONFIG.distribution,
        appVersion: BUILD_CONFIG.appVersion,
        editorVersion: BUILD_CONFIG.editorVersion,
      });
    },
    enable() {
      enabled = true;
      // dynamically add integrations once enabled
      integrations.forEach(integration => Sentry.addIntegration(integration));
    },
    disable() {
      enabled = false;
      // recreate the Sentry client with default settings
      this.init();
    },
  };

  // The Sentry browser session integration does not hook into beforeSend()
  // this custom Sentry integration manually disables the client at runtime
  const disableBrowserSessionIntegration = () => {
    return {
      name: 'DisableBrowserSessionIntegration',
      setup(client: Sentry.BrowserClient) {
        client.on('beforeSendSession', () => {
          client.getOptions().enabled = enabled;
        });
      },
    };
  };

  const integrations = [
    disableBrowserSessionIntegration(),
    ...Sentry.getDefaultIntegrations({}),
  ];

  return wrapped;
}

export const sentry = createSentry();
