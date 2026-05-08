from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey, func
from sqlalchemy.orm import relationship
import uuid
from app.database import Base

class CollectionItem(Base):
    __tablename__ = "collection_items"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    set_id = Column(String, ForeignKey("lego_sets.id"), nullable=True, index=True)
    minifig_id = Column(String, ForeignKey("minifigures.id"), nullable=True, index=True)
    status = Column(String(20), nullable=False, default="owned")  # owned, wishlist, previously_owned
    quantity = Column(Integer, default=1)
    condition = Column(String(20), nullable=True)  # sealed, opened, incomplete, damaged
    is_complete = Column(Boolean, default=True)
    is_sealed = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)
    date_acquired = Column(DateTime(timezone=True), nullable=True)
    purchase_price = Column(Float, nullable=True)
    added_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="collection_items")
    set = relationship("LegoSet")
    minifig = relationship("Minifigure")
