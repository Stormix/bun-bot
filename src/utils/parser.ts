/**
 * Parses the arguments for the create/edit command
 *
 * @param args The arguments to parse
 * @returns The parsed arguments
 */
export const parseCreateCommandArgs = (args: string[]) => {
  const command = args[1]
  let response = args[2]
  const allArgs = args.slice(2).join(' ')
  const isCode = allArgs.startsWith('```')

  if (['"', "'", '`'].includes(response[0])) {
    // Response should contain all arguments until the closing quote
    const closingQuote = response[0]

    const closingQuoteIndex = allArgs.lastIndexOf(closingQuote)

    if (closingQuoteIndex === -1) {
      throw new Error('MISSING_CLOSING_QUOTE')
    }

    // Get the response without the quotes
    response = allArgs.slice(1, closingQuoteIndex)

    if (isCode) {
      response = allArgs.slice(3, closingQuoteIndex - 2)
    }
  }

  return { command, response: response.trim(), isCode, allArgs }
}
