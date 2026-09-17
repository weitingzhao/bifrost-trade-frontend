import { transferPayUi } from './transferPayUi'

/**
 * The page is called Transfer & Pay and starts neither. Saying so where the
 * reader looks for it is safer than trusting the absence of a button to carry
 * the message.
 */
export function TransferPayWhatPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className={transferPayUi.whatPanel}>
      <div className={transferPayUi.whatHead}>
        <span className={transferPayUi.whatCap}>A record, not an instrument</span>
        <button type="button" className={transferPayUi.whatClose} onClick={onClose}>
          Close
        </button>
      </div>
      <div className={transferPayUi.whatBody}>
        <p className={transferPayUi.whatProse}>
          Deposits, withdrawals, dividends and broker charges, read from the IB Flex{' '}
          <span className="font-mono">transactions</span> report into{' '}
          <span className="font-mono">account_transactions</span>. The page name says Transfer &amp;
          Pay, but there is no transfer control and no payment control here, and there will not be
          one: money leaves or arrives at the broker, and this is where that shows up afterwards.
        </p>
        <p className={transferPayUi.whatAside}>
          The time axis is the date the cash event happened, not the date we fetched it.
        </p>
      </div>
    </div>
  )
}
