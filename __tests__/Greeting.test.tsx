import 'react-native';
import React from 'react';
import {Text} from 'react-native';
import Greeting from '../components/Greeting';

// Note: import React before renderer
import renderer from 'react-test-renderer';

it('renders Greeting component correctly', () => {
  const tree = renderer.create(<Greeting name="Ahmed" />).toJSON();
  expect(tree).toMatchSnapshot();
});

it('displays the correct greeting message', () => {
  const component = renderer.create(<Greeting name="Ahmed" />);
  const instance = component.root;
  const textElement = instance.findByType(Text);
  expect(textElement.props.children).toBe('Hello Ahmed!');
});