'use client';

import { useRef } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type Variants,
} from 'framer-motion';
import {
  Star,
  ArrowRight,
  PlayCircle,
  Briefcase,
  Zap,
  LockKeyhole,
  Infinity as InfinityIcon,
  Paperclip,
  CheckSquare,
} from 'lucide-react';

export interface HeroProps {
  onExploreTools: () => void;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const FEATURES: { icon: typeof Briefcase; strong: string; span: string }[] = [
  { icon: Briefcase, strong: '29+ Tools', span: 'and growing' },
  { icon: Zap, strong: 'AI Powered', span: 'Smart & Fast' },
  { icon: LockKeyhole, strong: '100% Secure', span: 'Your data is safe' },
  { icon: InfinityIcon, strong: 'No Limits', span: 'On creativity' },
];

const AVATARS = [11, 12, 13];

export function Hero({ onExploreTools }: HeroProps) {
  // 3D Tilt Effect
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 20 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ['10deg', '-10deg']);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ['-10deg', '10deg']);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / rect.width - 0.5;
    const yPct = mouseY / rect.height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <header
      className="mx-auto flex w-full max-w-[1400px] flex-col gap-10 px-4 pb-20 pt-10 sm:px-8 lg:flex-row lg:gap-8 lg:px-16 lg:pb-32 lg:pt-16"
      aria-label="Hero"
    >
      {/* LEFT: Hero content */}
      <motion.div
        className="flex flex-1 flex-col"
        style={{ maxWidth: '650px' }}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Badge */}
        <motion.div
          variants={itemVariants}
          className="inline-flex w-fit items-center gap-2 rounded border px-3 py-1.5 mb-8"
          style={{
            color: 'var(--smuggler-gold)',
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '1.5px',
            borderColor: 'rgba(192, 152, 88, 0.3)',
            textTransform: 'uppercase',
          }}
        >
          <Star
            size={12}
            className="fill-current"
            style={{ color: 'var(--smuggler-gold)' }}
            aria-hidden="true"
          />
          THE ALL-IN-ONE CREATOR TOOLKIT
        </motion.div>

        {/* Title */}
        <motion.h1
          variants={itemVariants}
          className="smuggler-hero-title-shadow"
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'clamp(2.75rem, 6vw, 4.5rem)',
            lineHeight: 1.1,
            fontWeight: 700,
            color: 'var(--smuggler-text)',
            marginBottom: '1.5rem',
          }}
        >
          Create Legendary Content.
          <br />
          <span style={{ color: 'var(--smuggler-green)' }}>
            Smuggle It
          </span>{' '}
          To Success.
        </motion.h1>

        {/* Description */}
        <motion.p
          variants={itemVariants}
          className="mb-10 max-w-[520px]"
          style={{
            color: 'var(--smuggler-text-secondary)',
            fontSize: '18px',
            lineHeight: 1.6,
          }}
        >
          AI-powered tools to ideate, create, optimize, and grow your content.
          Everything you need. One top-secret location.
        </motion.p>

        {/* Hero actions */}
        <motion.div
          variants={itemVariants}
          className="mb-16 flex flex-wrap items-center gap-6"
        >
          <button
            type="button"
            onClick={onExploreTools}
            className="smuggler-btn smuggler-btn-primary"
          >
            Explore All Tools
            <ArrowRight size={16} aria-hidden="true" />
          </button>
          <button type="button" className="smuggler-btn smuggler-btn-secondary">
            <PlayCircle size={20} aria-hidden="true" />
            See How It Works
          </button>

          {/* Social proof */}
          <div
            className="ml-2 flex items-center gap-4 pl-6"
            style={{ borderLeft: '1px solid var(--smuggler-border)' }}
          >
            <div className="flex">
              {AVATARS.map((imgId, idx) => (
                <img
                  key={imgId}
                  src={`https://i.pravatar.cc/100?img=${imgId}`}
                  alt={`Creator avatar ${idx + 1}`}
                  width={28}
                  height={28}
                  loading="lazy"
                  className="h-7 w-7 rounded-full object-cover"
                  style={{
                    marginLeft: idx === 0 ? 0 : '-10px',
                    border: '2px solid var(--smuggler-bg)',
                  }}
                />
              ))}
            </div>
            <div className="flex flex-col">
              <div className="mb-0.5 flex gap-0.5" aria-label="5 out of 5 stars">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star
                    key={i}
                    size={12}
                    className="fill-current"
                    style={{ color: 'var(--smuggler-gold)' }}
                    aria-hidden="true"
                  />
                ))}
              </div>
              <span
                style={{
                  fontSize: '12px',
                  color: 'var(--smuggler-text-secondary)',
                }}
              >
                Loved by 10,000+ Creators
              </span>
            </div>
          </div>
        </motion.div>

        {/* Features row */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-2 gap-6 sm:flex sm:flex-wrap sm:gap-8"
        >
          {FEATURES.map(({ icon: Icon, strong, span }) => (
            <div key={strong} className="flex items-center gap-3">
              <Icon
                size={24}
                style={{ color: 'var(--smuggler-green)' }}
                aria-hidden="true"
              />
              <div className="flex flex-col">
                <strong
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--smuggler-text)',
                  }}
                >
                  {strong}
                </strong>
                <span
                  style={{
                    fontSize: '12px',
                    color: 'var(--smuggler-text-muted)',
                  }}
                >
                  {span}
                </span>
              </div>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* RIGHT: Hero visual (hidden on small screens) */}
      <div
        className="relative hidden flex-1 lg:block"
        style={{ perspective: '1200px' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        aria-hidden="true"
      >
        <motion.div
          ref={ref}
          className="relative h-[500px] w-full"
          style={{
            rotateX,
            rotateY,
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Mission doc */}
          <div
            className="smuggler-paper absolute"
            style={{
              top: '-20px',
              right: '50px',
              width: '260px',
              padding: '1.5rem',
              transform: 'translateZ(20px) rotate(-4deg)',
              zIndex: 3,
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '-15px',
                left: '20px',
                transform: 'rotate(45deg)',
                color: '#555',
              }}
            >
              <Paperclip size={28} strokeWidth={2} aria-hidden="true" />
            </div>
            <div
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '1.5px',
                borderBottom: '1px dashed #1A120D',
                paddingBottom: '6px',
                marginBottom: '12px',
              }}
            >
              MISSION BRIEF
            </div>
            <h3
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '24px',
                lineHeight: 1.1,
                color: '#1A120D',
              }}
            >
              YOUR CONTENT.
              <br />
              OUR MISSION.
              <br />
              MAX IMPACT.
            </h3>
            <div
              className="smuggler-stamp-secret"
              style={{
                position: 'absolute',
                bottom: '-10px',
                right: '-10px',
              }}
            >
              TOP SECRET
            </div>
          </div>

          {/* Objectives doc */}
          <div
            className="smuggler-paper absolute"
            style={{
              top: '140px',
              right: '120px',
              width: '220px',
              padding: '1.5rem',
              transform: 'translateZ(10px) rotate(2deg)',
              zIndex: 4,
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '1.5px',
                borderBottom: '1px dashed #1A120D',
                paddingBottom: '6px',
                marginBottom: '12px',
              }}
            >
              OBJECTIVES
            </div>
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                fontSize: '13px',
                lineHeight: 1.8,
                fontWeight: 500,
                color: '#1A120D',
              }}
            >
              {['More Views', 'More Engagement', 'More Revenue'].map((item) => (
                <li
                  key={item}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <CheckSquare
                    size={14}
                    className="fill-current"
                    style={{ color: '#213A28' }}
                    aria-hidden="true"
                  />
                  {item}
                </li>
              ))}
            </ul>
            <div
              style={{
                fontFamily: 'var(--font-serif)',
                fontStyle: 'italic',
                fontSize: '20px',
                marginTop: '1.5rem',
                opacity: 0.7,
                color: '#1A120D',
              }}
            >
              Content Smuggler
            </div>
          </div>

          {/* Classified doc */}
          <div
            className="smuggler-paper absolute flex items-center justify-center"
            style={{
              top: '240px',
              right: '-20px',
              width: '180px',
              height: '140px',
              padding: '1rem',
              transform: 'translateZ(15px) rotate(-8deg)',
              zIndex: 2,
              backgroundColor: '#D3C1A1',
            }}
          >
            <div className="smuggler-stamp-classified">
              CLASSIFIED
              <br />
              <span style={{ fontSize: '8px' }}>HANDLE WITH CARE</span>
            </div>
          </div>

          {/* Wax seal */}
          <div
            className="smuggler-wax-seal absolute"
            style={{
              bottom: '40px',
              right: '80px',
              width: '50px',
              height: '50px',
              transform: 'translateZ(40px)',
              zIndex: 5,
              fontSize: '24px',
            }}
            aria-label="Wax seal stamped with letter C"
          >
            C
          </div>

          {/* Mascot */}
          <motion.img
            src="/smuggler/mascot-new.png"
            alt="Content Smuggler AI Spy mascot"
            style={{
              position: 'absolute',
              left: '-120px',
              top: '-50px',
              width: '600px',
              height: '600px',
              objectFit: 'contain',
              zIndex: 10,
              transform: 'translateZ(80px)',
              filter: 'drop-shadow(0px 20px 40px rgba(0,0,0,0.6))',
              pointerEvents: 'none',
            }}
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>
      </div>
    </header>
  );
}

export default Hero;
