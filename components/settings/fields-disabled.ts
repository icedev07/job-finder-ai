'use client';

import { createContext, useContext } from 'react';

/**
 * True inside a disabled <SettingsFieldset> (a slice the viewer's role cannot change). A native
 * <fieldset disabled> only disables native controls; the base-ui ones render spans and take their disabled state
 * from props only, so they read this instead (the ui wrappers RadioGroup, Switch, Checkbox and Slider, and the
 * Select and toggle chips of settings/fields): they then ignore clicks and keys and read as disabled.
 */
export const FieldsDisabledContext = createContext(false);

export function useFieldsDisabled(): boolean {
  return useContext(FieldsDisabledContext);
}
