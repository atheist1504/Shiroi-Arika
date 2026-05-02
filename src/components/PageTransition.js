'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';

export default function PageTransition({ children }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 5, filter: 'blur(4px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: 5, filter: 'blur(4px)' }}
        transition={{ 
          duration: 0.2, 
          ease: "easeInOut" 
        }}
        className="w-full h-full flex flex-col flex-1"
        style={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
