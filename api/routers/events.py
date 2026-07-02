from fastapi import APIRouter, Depends
from datetime import datetime
from ..models import EventReport, EventReportResponse
from ..state import state_manager
from ..detection import update_ema_default_rate, update_cusum
from ..auth import verify_api_key, Developer

router = APIRouter()

@router.post("/events", response_model=EventReportResponse)
async def report_event(event: EventReport, dev: Developer = Depends(verify_api_key)):
    provider_id = event.provider_id
    success = event.success
    
    if event.buyer_id:
        await state_manager.add_trust_edge(event.buyer_id, provider_id)
        
    provider = await state_manager.get_provider(provider_id)
    
    flag = 0 if success else 1
    new_ema = update_ema_default_rate(flag, provider.ema_default_rate)
    cusum_res = update_cusum(flag, provider.cusum_state)
    
    await state_manager.update_provider(
        provider_id=provider_id,
        success=success,
        cusum_state=cusum_res.state,
        ema_rate=new_ema
    )
    
    return EventReportResponse(
        status="success",
        processed_at=datetime.utcnow().isoformat()
    )
