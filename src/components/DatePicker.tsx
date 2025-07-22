'use client'

import React, { useState, useEffect, useRef } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek, subMonths, addMonths, isSameMonth } from 'date-fns'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

interface DatePickerProps {
  availableDates: Date[] // 有数据的日期列表
  onDateSelect: (date: Date) => void
  selectedDate?: Date
}

export const DatePicker: React.FC<DatePickerProps> = ({ 
  availableDates, 
  onDateSelect, 
  selectedDate 
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const containerRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭日历
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // 获取当前月份的所有日期
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }) // 周一开始
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  // 检查日期是否有数据
  const hasData = (date: Date) => {
    return availableDates.some(availableDate => 
      isSameDay(availableDate, date)
    )
  }

  // 检查是否是选中的日期
  const isSelected = (date: Date) => {
    return selectedDate && isSameDay(date, selectedDate)
  }

  // 处理日期点击
  const handleDateClick = (date: Date) => {
    if (hasData(date)) {
      onDateSelect(date)
      setIsOpen(false)
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      {/* 日历按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-lg transition-all duration-200 flex items-center gap-2 ${
          isOpen
            ? 'bg-blue-500 text-white shadow-lg'
            : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
        }`}
        title="选择日期"
      >
        <Calendar className="w-5 h-5" />
      </button>

      {/* 日历下拉面板 */}
      {isOpen && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 min-w-[320px]">
          <div className="p-4">
            {/* 月份导航 */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {format(currentMonth, 'yyyy年MM月')}
              </h3>
              
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* 星期标题 */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['一', '二', '三', '四', '五', '六', '日'].map((day) => (
                <div key={day} className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 p-2">
                  {day}
                </div>
              ))}
            </div>

            {/* 日期网格 */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((date) => {
                const isCurrentMonth = isSameMonth(date, currentMonth)
                const hasDataForDate = hasData(date)
                const isSelectedDate = isSelected(date)
                const isToday = isSameDay(date, new Date())

                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => handleDateClick(date)}
                    disabled={!hasDataForDate}
                    className={`
                      w-10 h-10 text-sm rounded-lg transition-all duration-200 relative
                      ${!isCurrentMonth ? 'text-gray-300 dark:text-gray-600' : ''}
                      ${!hasDataForDate && isCurrentMonth ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed' : ''}
                      ${hasDataForDate && !isSelectedDate ? 'text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer' : ''}
                      ${isSelectedDate ? 'bg-blue-500 text-white font-semibold shadow-lg' : ''}
                      ${isToday && !isSelectedDate ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}
                    `}
                    title={hasDataForDate ? `查看 ${format(date, 'yyyy-MM-dd')} 的数据` : '暂无数据'}
                  >
                    {format(date, 'd')}
                    
                    {/* 有数据的日期显示小圆点 */}
                    {hasDataForDate && !isSelectedDate && (
                      <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    )}
                  </button>
                )
              })}
            </div>

            {/* 说明文字 */}
            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  <span>有数据</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 ring-2 ring-blue-500 ring-opacity-50 rounded"></div>
                  <span>今日</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}