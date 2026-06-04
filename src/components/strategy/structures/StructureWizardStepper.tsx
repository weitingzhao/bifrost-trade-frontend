import { cn } from '@/lib/utils'
import type { MetaParamItem } from '@/types/strategy'
import styles from './structuresForm.module.css'

interface StructureWizardStepperProps {
  wizardStep: 1 | 2 | 3
  selectedTemplateId: number | null
  metaParams: MetaParamItem[] | undefined
  onStepClick: (step: 1 | 2) => void
}

export function StructureWizardStepper({
  wizardStep,
  selectedTemplateId,
  metaParams,
  onStepClick,
}: StructureWizardStepperProps) {
  const hasEditableMeta = (metaParams ?? []).some((p) => p.param_kind !== 'fixed')
  const step2Skipped = !selectedTemplateId || !hasEditableMeta

  return (
    <div className={styles.wizardStepper} role="list" aria-label="Wizard steps">
      <div
        className={cn(
          styles.wizardStepItem,
          wizardStep > 1 && styles.wizardStepDone,
          wizardStep === 1 && styles.wizardStepActive,
          wizardStep > 1 && styles.wizardStepClickable,
        )}
        role="listitem"
        aria-current={wizardStep === 1 ? 'step' : undefined}
        onClick={wizardStep > 1 ? () => onStepClick(1) : undefined}
      >
        <div className={styles.wizardStepHead}>
          <div className={styles.wizardStepCircle}>
            {wizardStep > 1 ? (
              <span className={styles.wizardStepCheck} aria-hidden>
                ✓
              </span>
            ) : (
              <span>1</span>
            )}
          </div>
          <div className={styles.wizardStepConnector} aria-hidden />
        </div>
        <span className={styles.wizardStepLabel}>Template</span>
      </div>

      <div
        className={cn(
          styles.wizardStepItem,
          wizardStep > 2 && styles.wizardStepDone,
          wizardStep === 2 && styles.wizardStepActive,
          step2Skipped && styles.wizardStepSkip,
          wizardStep > 2 && hasEditableMeta && styles.wizardStepClickable,
        )}
        role="listitem"
        aria-current={wizardStep === 2 ? 'step' : undefined}
        onClick={
          wizardStep > 2 && hasEditableMeta ? () => onStepClick(2) : undefined
        }
      >
        <div className={styles.wizardStepHead}>
          <div className={styles.wizardStepCircle}>
            {wizardStep > 2 ? (
              <span className={styles.wizardStepCheck} aria-hidden>
                ✓
              </span>
            ) : (
              <span>2</span>
            )}
          </div>
          <div className={styles.wizardStepConnector} aria-hidden />
        </div>
        <span className={styles.wizardStepLabel}>Parameters</span>
      </div>

      <div
        className={cn(
          styles.wizardStepItem,
          styles.wizardStepItemLast,
          wizardStep === 3 && styles.wizardStepActive,
        )}
        role="listitem"
        aria-current={wizardStep === 3 ? 'step' : undefined}
      >
        <div className={styles.wizardStepHead}>
          <div className={styles.wizardStepCircle}>
            <span>3</span>
          </div>
        </div>
        <span className={styles.wizardStepLabel}>Details</span>
      </div>
    </div>
  )
}
