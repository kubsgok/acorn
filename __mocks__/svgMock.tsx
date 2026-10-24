// Jest stand-in for imported .svg components.
import { View } from 'react-native'

export default function SvgMock(props: object) {
  return <View {...props} />
}
