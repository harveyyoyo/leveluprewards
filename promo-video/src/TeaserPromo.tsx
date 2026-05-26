import React from "react";
import { EXTENDED_VARIANT, SQUARE_VARIANT, TEASER_VARIANT } from "./promo/promoVariants";
import { PortraitWalkthroughPromo } from "./PortraitWalkthroughPromo";

export const TeaserPromo: React.FC = () => (
  <PortraitWalkthroughPromo variant={TEASER_VARIANT} />
);

export const SquarePromo: React.FC = () => (
  <PortraitWalkthroughPromo variant={SQUARE_VARIANT} />
);

export const ExtendedPromo30: React.FC = () => (
  <PortraitWalkthroughPromo variant={EXTENDED_VARIANT} />
);
