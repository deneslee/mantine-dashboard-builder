import * as a11yAddonAnnotations from '@storybook/addon-a11y/preview';
import { setProjectAnnotations } from '@storybook/react-vite';
import * as projectAnnotations from './preview';

// Stories run as tests with the same decorators and parameters (a11y included) as in Storybook.
setProjectAnnotations([a11yAddonAnnotations, projectAnnotations]);
