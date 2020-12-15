import * as React from 'react';
import { Animated, View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import {
  NavigationContext,
  NavigationRouteContext,
  Route,
  ParamListBase,
} from '@react-navigation/native';
import type { EdgeInsets } from 'react-native-safe-area-context';

import Header from './Header';
import {
  forSlideLeft,
  forSlideUp,
  forNoAnimation,
  forSlideRight,
} from '../../TransitionConfigs/HeaderStyleInterpolators';
import PreviousSceneContext from '../../utils/PreviousSceneContext';
import type {
  Layout,
  Scene,
  StackHeaderStyleInterpolator,
  StackNavigationProp,
  StackHeaderProps,
  GestureDirection,
} from '../../types';

export type Props = {
  mode: 'float' | 'screen';
  layout: Layout;
  insets: EdgeInsets;
  scenes: (Scene | undefined)[];
  getPreviousScene: (props: { route: Route<string> }) => Scene | undefined;
  getFocusedRoute: () => Route<string>;
  onContentHeightChange?: (props: {
    route: Route<string>;
    height: number;
  }) => void;
  styleInterpolator: StackHeaderStyleInterpolator;
  gestureDirection: GestureDirection;
  style?: StyleProp<ViewStyle>;
};

export default function HeaderContainer({
  mode,
  scenes,
  layout,
  insets,
  getPreviousScene,
  getFocusedRoute,
  onContentHeightChange,
  gestureDirection,
  styleInterpolator,
  style,
}: Props) {
  const focusedRoute = getFocusedRoute();
  const parentPreviousScene = React.useContext(PreviousSceneContext);

  return (
    <Animated.View pointerEvents="box-none" style={style}>
      {scenes.slice(-3).map((scene, i, self) => {
        if ((mode === 'screen' && i !== self.length - 1) || !scene) {
          return null;
        }

        const { header, headerShown = true, headerTransparent } =
          scene.descriptor.options || {};

        if (!headerShown) {
          return null;
        }

        const isFocused = focusedRoute.key === scene.descriptor.route.key;
        const previousScene =
          getPreviousScene({ route: scene.descriptor.route }) ??
          parentPreviousScene;

        // If the screen is next to a headerless screen, we need to make the header appear static
        // This makes the header look like it's moving with the screen
        const previousDescriptor = self[i - 1]?.descriptor;
        const nextDescriptor = self[i + 1]?.descriptor;

        const { headerShown: previousHeaderShown = true } =
          previousDescriptor?.options || {};

        const { headerShown: nextHeaderShown = true } =
          nextDescriptor?.options || {};

        const isHeaderStatic =
          (previousHeaderShown === false &&
            // We still need to animate when coming back from next scene
            // A hacky way to check this is if the next scene exists
            !nextDescriptor) ||
          nextHeaderShown === false;

        const props: StackHeaderProps = {
          layout,
          insets,
          previous: previousScene
            ? {
                progress: previousScene.progress,
                options: previousScene.descriptor.options,
                route: previousScene.descriptor.route,
              }
            : undefined,
          progress: scene.progress,
          options: scene.descriptor.options,
          route: scene.descriptor.route,
          navigation: scene.descriptor
            .navigation as StackNavigationProp<ParamListBase>,
          styleInterpolator:
            mode === 'float'
              ? isHeaderStatic
                ? gestureDirection === 'vertical' ||
                  gestureDirection === 'vertical-inverted'
                  ? forSlideUp
                  : gestureDirection === 'horizontal-inverted'
                  ? forSlideRight
                  : forSlideLeft
                : styleInterpolator
              : forNoAnimation,
        };

        return (
          <NavigationContext.Provider
            key={scene.descriptor.route.key}
            value={scene.descriptor.navigation}
          >
            <NavigationRouteContext.Provider value={scene.descriptor.route}>
              <View
                onLayout={
                  onContentHeightChange
                    ? (e) => {
                        const { height } = e.nativeEvent.layout;

                        onContentHeightChange({
                          route: scene.descriptor.route,
                          height,
                        });
                      }
                    : undefined
                }
                pointerEvents={isFocused ? 'box-none' : 'none'}
                accessibilityElementsHidden={!isFocused}
                importantForAccessibility={
                  isFocused ? 'auto' : 'no-hide-descendants'
                }
                style={
                  // Avoid positioning the focused header absolutely
                  // Otherwise accessibility tools don't seem to be able to find it
                  (mode === 'float' && !isFocused) || headerTransparent
                    ? styles.header
                    : null
                }
              >
                {header !== undefined ? header(props) : <Header {...props} />}
              </View>
            </NavigationRouteContext.Provider>
          </NavigationContext.Provider>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
});
