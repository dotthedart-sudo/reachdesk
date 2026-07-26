import React from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import './shiny-button.css';

const animationProps = {
  initial: { '--x': '100%', scale: 0.8 },
  animate: { '--x': '-100%', scale: 1 },
  whileTap: { scale: 0.95 },
  transition: {
    repeat: Infinity,
    repeatType: 'loop',
    repeatDelay: 1,
    type: 'spring',
    stiffness: 20,
    damping: 15,
    mass: 2,
    scale: {
      type: 'spring',
      stiffness: 200,
      damping: 5,
      mass: 0.5,
    },
  },
};

export const ShinyButton = React.forwardRef(function ShinyButton(
  { children, className, type = 'button', ...props },
  ref
) {
  return (
    <motion.button
      ref={ref}
      type={type}
      className={cn('shiny-button', className)}
      {...animationProps}
      {...props}
    >
      <span className="shiny-button__label">{children}</span>
      <span className="shiny-button__shine" aria-hidden />
    </motion.button>
  );
});

ShinyButton.displayName = 'ShinyButton';
