import { fireEvent, render, screen } from '@testing-library/react-native'
import { LabeledDivider, SocialButton, TextLink } from '@/components/ui'

describe('TextLink', () => {
  it('is a link that calls onPress', async () => {
    const onPress = jest.fn()
    await render(<TextLink label="Forgot password?" onPress={onPress} />)
    await fireEvent.press(screen.getByRole('link', { name: 'Forgot password?' }))
    expect(onPress).toHaveBeenCalledTimes(1)
  })
})

describe('SocialButton', () => {
  it.each(['apple', 'google'] as const)('%s button is labelled and pressable', async (provider) => {
    const onPress = jest.fn()
    await render(
      <SocialButton provider={provider} label={`Continue with ${provider}`} onPress={onPress} />,
    )
    await fireEvent.press(screen.getByRole('button', { name: `Continue with ${provider}` }))
    expect(onPress).toHaveBeenCalledTimes(1)
  })
})

describe('LabeledDivider', () => {
  it('shows its label', async () => {
    await render(<LabeledDivider label="or continue with" />)
    expect(screen.getByText('or continue with')).toBeOnTheScreen()
  })
})
