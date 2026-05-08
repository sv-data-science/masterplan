from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, func
from app.database import Base

class LegoSet(Base):
    __tablename__ = "lego_sets"

    id = Column(String, primary_key=True)
    set_number = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    theme = Column(String(100), nullable=False, index=True)
    subtheme = Column(String(100), nullable=True)
    year = Column(Integer, nullable=False, index=True)
    pieces = Column(Integer, nullable=True)
    minifigs = Column(Integer, default=0)
    msrp = Column(Float, nullable=True)
    currency = Column(String(3), default="USD")
    image_url = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    availability = Column(String(20), default="available")
    is_retired = Column(Boolean, default=False)
    retiring_soon = Column(Boolean, default=False)
    estimated_value = Column(Float, nullable=True)
    brickset_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Minifigure(Base):
    __tablename__ = "minifigures"

    id = Column(String, primary_key=True)
    fig_number = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    character_name = Column(String(255), nullable=True)
    theme = Column(String(100), nullable=False, index=True)
    year = Column(Integer, nullable=False)
    image_url = Column(String, nullable=True)
    is_cmf = Column(Boolean, default=False)
    cmf_series = Column(String(100), nullable=True)
    estimated_value = Column(Float, nullable=True)
    rarity = Column(String(20), default="common")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
